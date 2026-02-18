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
import { formatDate } from '../../utils/formatDate';
import api from '../../services/api';
import type { ReportResponse, ReportStatus } from '../../types';

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  INAPPROPRIATE: 'Inappropriate',
  HARASSMENT: 'Harassment',
  OFF_TOPIC: 'Off Topic',
  OTHER: 'Other',
};

const REASON_COLORS: Record<string, string> = {
  SPAM: '#FFC107',
  INAPPROPRIATE: '#FF5252',
  HARASSMENT: '#FF5252',
  OFF_TOPIC: '#2196F3',
  OTHER: '#9E9E9E',
};

export default function ReportsScreen() {
  const router = useRouter();
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();

  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReportStatus>('ALL');

  const fetchReports = useCallback(async () => {
    if (!whiteboardId) return;
    try {
      const params: Record<string, string | number> = { page: 0, size: 50 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const response = await api.get(`/reports/whiteboard/${whiteboardId}`, { params });
      setReports(response.data.content || response.data || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [whiteboardId, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await api.put(`/reports/${reportId}`, { status: 'DISMISSED' });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      Alert.alert('Dismissed', 'Report has been dismissed.');
    } catch {
      Alert.alert('Error', 'Failed to dismiss report.');
    }
  };

  const handleRemoveContent = async (report: ReportResponse) => {
    Alert.alert(
      'Remove Content',
      'This will hide the reported content from all users. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/reports/${report.id}`, { status: 'REVIEWED' });
              setReports((prev) => prev.filter((r) => r.id !== report.id));
              Alert.alert('Removed', 'Content has been hidden.');
            } catch {
              Alert.alert('Error', 'Failed to remove content.');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (reportId: string) => {
    try {
      await api.put(`/reports/${reportId}`, { status: 'DISMISSED' });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      Alert.alert('Restored', 'Content has been restored.');
    } catch {
      Alert.alert('Error', 'Failed to restore content.');
    }
  };

  const statusFilters: { label: string; value: 'ALL' | ReportStatus }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Reviewed', value: 'REVIEWED' },
    { label: 'Dismissed', value: 'DISMISSED' },
  ];

  const renderReportItem = ({ item }: { item: ReportResponse }) => (
    <GlassCard style={styles.reportCard}>
      {/* Report Header */}
      <View style={styles.reportHeader}>
        <View
          style={[
            styles.reasonBadge,
            { backgroundColor: `${REASON_COLORS[item.reason] || '#9E9E9E'}20` },
          ]}
        >
          <Text
            style={[
              styles.reasonText,
              { color: REASON_COLORS[item.reason] || '#9E9E9E' },
            ]}
          >
            {REASON_LABELS[item.reason] || item.reason}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'PENDING' && styles.pendingBadge,
            item.status === 'REVIEWED' && styles.reviewedBadge,
            item.status === 'DISMISSED' && styles.dismissedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'PENDING' && styles.pendingText,
              item.status === 'REVIEWED' && styles.reviewedText,
              item.status === 'DISMISSED' && styles.dismissedText,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      {/* Content Info */}
      <View style={styles.contentInfo}>
        <Text style={styles.contentType}>
          {item.questionId ? 'Question' : 'Comment'} Report
        </Text>
        <Text style={styles.reporterText}>
          Reported by {item.reporterName}
        </Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* Notes */}
      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}

      {/* Actions */}
      {item.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => handleDismiss(item.id)}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveContent(item)}
          >
            <Text style={styles.removeButtonText}>Remove Content</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => handleRestore(item.id)}
          >
            <Text style={styles.restoreButtonText}>Restore</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View Content Link */}
      <TouchableOpacity
        style={styles.viewLink}
        onPress={() => {
          if (item.questionId) {
            router.push(
              `/question/${item.questionId}?whiteboardId=${whiteboardId}`
            );
          }
        }}
      >
        <Text style={styles.viewLinkText}>View Content {"\u203A"}</Text>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Moderation</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                statusFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => {
                setStatusFilter(filter.value);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reports List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={reports}
            renderItem={renderReportItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              reports.length === 0 && styles.emptyList,
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
                icon={"\u{1F6A9}"}
                title="No Reports"
                subtitle="There are no reported items to review"
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
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  filterContainer: {
    flexDirection: 'row',
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
  reportCard: {
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  reasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reasonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,193,7,0.15)',
  },
  reviewedBadge: {
    backgroundColor: 'rgba(0,200,81,0.15)',
  },
  dismissedBadge: {
    backgroundColor: 'rgba(158,158,158,0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pendingText: {
    color: Colors.warning,
  },
  reviewedText: {
    color: Colors.success,
  },
  dismissedText: {
    color: '#9E9E9E',
  },
  contentInfo: {
    marginBottom: 10,
  },
  contentType: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  reporterText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  notesContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  notesText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  removeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.error,
  },
  restoreButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,200,81,0.15)',
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.success,
  },
  viewLink: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  viewLinkText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
