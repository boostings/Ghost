import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { Colors, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { formatTimestampLong } from '../../utils/formatTimestamp';
import { extractErrorMessage } from '../../hooks/useApi';
import { auditLogService } from '../../services/auditLogService';
import type { AuditLogResponse, AuditAction } from '../../types';

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  QUESTION_CREATED: 'add-circle-outline',
  QUESTION_EDITED: 'create-outline',
  QUESTION_DELETED: 'trash-outline',
  COMMENT_CREATED: 'chatbubble-outline',
  COMMENT_EDITED: 'create-outline',
  COMMENT_DELETED: 'trash-outline',
  VERIFIED_ANSWER_PROVIDED: 'checkmark-circle-outline',
  QUESTION_CLOSED: 'lock-closed-outline',
  QUESTION_FORWARDED: 'arrow-forward-circle-outline',
  USER_ENLISTED: 'person-add-outline',
  USER_REMOVED: 'person-remove-outline',
  WHITEBOARD_CREATED: 'clipboard-outline',
  WHITEBOARD_DELETED: 'trash-outline',
  REPORT_SUBMITTED: 'flag-outline',
  CONTENT_HIDDEN: 'eye-off-outline',
  CONTENT_RESTORED: 'refresh-outline',
  TOPIC_CREATED: 'pricetag-outline',
  TOPIC_DELETED: 'trash-outline',
  OWNERSHIP_TRANSFERRED: 'shield-checkmark-outline',
};

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const FILTER_OPTIONS = [
  'ALL',
  'QUESTION_CREATED',
  'QUESTION_EDITED',
  'COMMENT_CREATED',
  'VERIFIED_ANSWER_PROVIDED',
  'USER_ENLISTED',
  'USER_REMOVED',
  'REPORT_SUBMITTED',
] as const;

type DateWindow = 'ALL_TIME' | 'LAST_24H' | 'LAST_7D' | 'LAST_30D';

const DATE_FILTER_OPTIONS: { label: string; value: DateWindow }[] = [
  { label: 'All Time', value: 'ALL_TIME' },
  { label: '24h', value: 'LAST_24H' },
  { label: '7d', value: 'LAST_7D' },
  { label: '30d', value: 'LAST_30D' },
];

function getDateRange(value: DateWindow): { from?: string; to?: string } {
  if (value === 'ALL_TIME') {
    return {};
  }

  const to = new Date();
  const from = new Date(to);
  if (value === 'LAST_24H') {
    from.setDate(from.getDate() - 1);
  } else if (value === 'LAST_7D') {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }

  const formatIsoSecondParam = (date: Date) => date.toISOString().slice(0, 19);

  return {
    from: formatIsoSecondParam(from),
    to: formatIsoSecondParam(to),
  };
}

function extractQuestionTitle(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:^|;\s*)title=([^;]+)/);
  return match?.[1] ?? value;
}

function formatAuditValue(value: string): string {
  if (value === 'true') return 'Pinned';
  if (value === 'false') return 'Unpinned';
  return value;
}

export default function AuditLogScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();

  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateWindow>('ALL_TIME');
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastFetchRef = useRef(0);
  const lastFilterRef = useRef(actionFilter);
  const lastDateFilterRef = useRef(dateFilter);
  const PAGE_SIZE = 20;
  const questionTitleById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      if (log.targetType !== 'Question' || !log.targetId) continue;
      const title = extractQuestionTitle(log.newValue) ?? extractQuestionTitle(log.oldValue);
      if (title) map.set(log.targetId, title);
    }
    return map;
  }, [logs]);

  const fetchLogs = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      if (!whiteboardId) return;
      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (!replace && (!hasMore || loadingMore)) {
        return;
      }

      try {
        if (replace) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const dateRange = getDateRange(dateFilter);
        const response = await auditLogService.list(whiteboardId, {
          action: actionFilter === 'ALL' ? undefined : (actionFilter as AuditAction),
          from: dateRange.from,
          to: dateRange.to,
          page: nextPage,
          size: PAGE_SIZE,
        });
        setLogs((prev) => (replace ? response.content : [...prev, ...response.content]));
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        setLoadError(null);
        lastFetchRef.current = Date.now();
      } catch {
        if (replace) {
          setLogs([]);
        }
        setHasMore(false);
        setLoadError('Failed to load audit logs.');
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [actionFilter, dateFilter, hasMore, loadingMore, whiteboardId]
  );

  useFocusEffect(
    useCallback(() => {
      const filterChanged =
        lastFilterRef.current !== actionFilter || lastDateFilterRef.current !== dateFilter;
      if (filterChanged) {
        lastFilterRef.current = actionFilter;
        lastDateFilterRef.current = dateFilter;
        fetchLogs({ page: 0, replace: true });
        return;
      }

      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (logs.length === 0 || isStale) {
        fetchLogs({ page: 0, replace: true });
      }
    }, [actionFilter, dateFilter, fetchLogs, logs.length])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs({ page: 0, replace: true });
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    await fetchLogs({ page: page + 1, replace: false });
  };

  const handleActionFilterPress = (nextActionFilter: string) => {
    if (nextActionFilter === actionFilter) {
      return;
    }
    setActionFilter(nextActionFilter);
    setLoading(true);
  };

  const handleDateFilterPress = (nextDateFilter: DateWindow) => {
    if (nextDateFilter === dateFilter) {
      return;
    }
    setDateFilter(nextDateFilter);
    setLoading(true);
  };

  const handleExport = async () => {
    if (!whiteboardId) {
      return;
    }
    setExporting(true);
    try {
      const csv = await auditLogService.exportCsv(whiteboardId);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ghost-audit-log-${whiteboardId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Export', 'Audit log CSV download started.');
      } else {
        const canShare = await Sharing.isAvailableAsync();
        const cacheDirectory = FileSystem.cacheDirectory;
        if (!canShare || !cacheDirectory) {
          throw new Error('Native file sharing is unavailable.');
        }

        const fileUri = `${cacheDirectory}ghost-audit-log-${whiteboardId}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
          dialogTitle: 'Share audit log CSV',
        });
        Alert.alert('Export', 'Audit log CSV ready to share.');
      }
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const renderLogItem = ({ item }: { item: AuditLogResponse }) => {
    const questionTitle =
      item.targetType === 'Question' && item.targetId ? questionTitleById.get(item.targetId) : null;

    return (
    <GlassCard style={styles.logCard}>
      <View style={styles.logRow}>
        <View style={styles.logIconContainer}>
          <Ionicons
            name={ACTION_ICONS[item.action] || 'document-text-outline'}
            size={18}
            color={Colors.primary}
          />
        </View>

        <View style={styles.logContent}>
          <Text style={styles.logAction}>{formatAction(item.action)}</Text>
          <Text style={styles.logActor}>{item.actorName}</Text>
          {item.targetType && questionTitle && item.targetId ? (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/question/[id]',
                  params: { id: item.targetId, whiteboardId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open question ${questionTitle}`}
            >
              <Text style={styles.logTarget}>Question: {questionTitle}</Text>
            </TouchableOpacity>
          ) : item.targetType ? (
            <Text style={styles.logTarget}>
              {item.targetType}: {item.targetId?.slice(0, 8) || 'N/A'}
            </Text>
          ) : null}
          <Text style={styles.logDate}>{formatTimestampLong(item.createdAt)}</Text>
        </View>
      </View>

      {(item.oldValue || item.newValue) && (
        <View style={styles.logValues}>
          {item.oldValue && (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Old:</Text>
              <Text style={styles.valueText} numberOfLines={2}>
                {formatAuditValue(item.oldValue)}
              </Text>
            </View>
          )}
          {item.newValue && (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabelNew}>New:</Text>
              <Text style={styles.valueText} numberOfLines={2}>
                {formatAuditValue(item.newValue)}
              </Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
  };

  return (
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader
          title="Audit Log"
          subtitle="Activity history"
          rightElement={
            <TouchableOpacity
              onPress={handleExport}
              style={styles.exportButton}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Export audit log as CSV"
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={Colors.primary} />
                  <Text style={styles.exportText}>CSV</Text>
                </>
              )}
            </TouchableOpacity>
          }
        />

        {/* Filter Chips */}
        <View style={styles.filtersSection}>
          <FlatList
            horizontal
            data={FILTER_OPTIONS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: themeColors.surfaceLight,
                    borderColor: themeColors.surfaceBorder,
                  },
                  actionFilter === item && {
                    backgroundColor: `${themeColors.primary}26`,
                    borderColor: themeColors.primary,
                  },
                ]}
                onPress={() => handleActionFilterPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`Filter audit log by ${item === 'ALL' ? 'all actions' : formatAction(item)}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: themeColors.textSecondary },
                    actionFilter === item && { color: themeColors.primary },
                  ]}
                >
                  {item === 'ALL' ? 'All' : formatAction(item)}
                </Text>
              </TouchableOpacity>
            )}
          />

          <FlatList
            horizontal
            data={DATE_FILTER_OPTIONS}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterListCompact}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: themeColors.surfaceLight,
                    borderColor: themeColors.surfaceBorder,
                  },
                  dateFilter === item.value && {
                    backgroundColor: `${themeColors.primary}26`,
                    borderColor: themeColors.primary,
                  },
                ]}
                onPress={() => handleDateFilterPress(item.value)}
                accessibilityRole="button"
                accessibilityLabel={`Filter audit log by ${item.label}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    dateFilter === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Log List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, logs.length === 0 && styles.emptyList]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                ionIcon="document-text-outline"
                title="No Audit Entries"
                subtitle={loadError || 'Activity will be recorded here as changes are made'}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(187,39,68,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.4)',
  },
  exportText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterListCompact: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  logCard: {
    marginBottom: 10,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(187,39,68,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  logActor: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  logTarget: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logDate: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  logValues: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  valueRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.error,
    marginRight: 8,
    minWidth: 32,
  },
  valueLabelNew: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.success,
    marginRight: 8,
    minWidth: 32,
  },
  valueText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
});
