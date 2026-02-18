import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { formatDate, formatFullDate } from '../../utils/formatDate';
import api from '../../services/api';
import type { AuditLogResponse, AuditAction } from '../../types';

const ACTION_ICONS: Record<string, string> = {
  QUESTION_CREATED: '\u2795',
  QUESTION_EDITED: '\u270F\uFE0F',
  QUESTION_DELETED: '\u{1F5D1}\uFE0F',
  COMMENT_CREATED: '\u{1F4AC}',
  COMMENT_EDITED: '\u270F\uFE0F',
  COMMENT_DELETED: '\u{1F5D1}\uFE0F',
  VERIFIED_ANSWER_PROVIDED: '\u2705',
  QUESTION_CLOSED: '\u{1F512}',
  QUESTION_FORWARDED: '\u27A1\uFE0F',
  USER_ENLISTED: '\u{1F465}',
  USER_REMOVED: '\u{1F6AB}',
  WHITEBOARD_CREATED: '\u{1F4CB}',
  WHITEBOARD_DELETED: '\u{1F5D1}\uFE0F',
  REPORT_SUBMITTED: '\u{1F6A9}',
  CONTENT_HIDDEN: '\u{1F441}\uFE0F',
  CONTENT_RESTORED: '\u{1F504}',
  TOPIC_CREATED: '\u{1F3F7}\uFE0F',
  TOPIC_DELETED: '\u{1F5D1}\uFE0F',
  OWNERSHIP_TRANSFERRED: '\u{1F451}',
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

export default function AuditLogScreen() {
  const router = useRouter();
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();

  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!whiteboardId) return;
    try {
      const params: Record<string, string | number> = { page: 0, size: 50 };
      if (actionFilter !== 'ALL') {
        params.action = actionFilter;
      }
      const response = await api.get(`/whiteboards/${whiteboardId}/audit-logs`, {
        params,
      });
      setLogs(response.data.content || response.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [whiteboardId, actionFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.get(`/whiteboards/${whiteboardId}/audit-logs/export`);
      Alert.alert('Export', 'Audit log CSV has been prepared for download.');
    } catch {
      Alert.alert('Error', 'Failed to export audit logs.');
    } finally {
      setExporting(false);
    }
  };

  const renderLogItem = ({ item }: { item: AuditLogResponse }) => (
    <GlassCard style={styles.logCard}>
      <View style={styles.logRow}>
        <View style={styles.logIconContainer}>
          <Text style={styles.logIcon}>
            {ACTION_ICONS[item.action] || '\u{1F4DD}'}
          </Text>
        </View>

        <View style={styles.logContent}>
          <Text style={styles.logAction}>{formatAction(item.action)}</Text>
          <Text style={styles.logActor}>{item.actorName}</Text>
          {item.targetType && (
            <Text style={styles.logTarget}>
              {item.targetType}: {item.targetId?.slice(0, 8) || 'N/A'}
            </Text>
          )}
          <Text style={styles.logDate}>{formatFullDate(item.createdAt)}</Text>
        </View>
      </View>

      {(item.oldValue || item.newValue) && (
        <View style={styles.logValues}>
          {item.oldValue && (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Old:</Text>
              <Text style={styles.valueText} numberOfLines={2}>
                {item.oldValue}
              </Text>
            </View>
          )}
          {item.newValue && (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabelNew}>New:</Text>
              <Text style={styles.valueText} numberOfLines={2}>
                {item.newValue}
              </Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backArrow}>{"\u2190"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Audit Log</Text>
          <TouchableOpacity
            onPress={handleExport}
            style={styles.exportButton}
            disabled={exporting}
          >
            <Text style={styles.exportText}>
              {exporting ? '...' : 'CSV'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
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
                actionFilter === item && styles.filterChipActive,
              ]}
              onPress={() => {
                setActionFilter(item);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  actionFilter === item && styles.filterChipTextActive,
                ]}
              >
                {item === 'ALL' ? 'All' : formatAction(item)}
              </Text>
            </TouchableOpacity>
          )}
        />

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
            contentContainerStyle={[
              styles.listContent,
              logs.length === 0 && styles.emptyList,
            ]}
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
                icon={"\u{1F4CB}"}
                title="No Audit Entries"
                subtitle="Activity will be recorded here as changes are made"
              />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 18,
    color: Colors.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  exportButton: {
    backgroundColor: 'rgba(108,99,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.4)',
  },
  exportText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: 'rgba(108,99,255,0.25)',
    borderColor: Colors.primary,
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
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logIcon: {
    fontSize: 16,
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
