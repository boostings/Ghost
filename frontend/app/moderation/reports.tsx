import React from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import SettingsHeader from '../../components/whiteboard/SettingsHeader';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import {
  REPORT_STATUS_FILTERS,
  useModerationReportsModel,
} from '../../hooks/useModerationReportsModel';
import { extractErrorMessage } from '../../hooks/useApi';
import { formatDate } from '../../utils/formatDate';
import type { ReportResponse } from '../../types';

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
  const {
    reports,
    loading,
    refreshing,
    statusFilter,
    loadError,
    loadingMore,
    handleRefresh,
    handleLoadMore,
    handleStatusFilter,
    dismissReport,
    removeReportedContent,
  } = useModerationReportsModel(whiteboardId);
  const pendingCount = reports.filter((report) => report.status === 'PENDING').length;

  const handleDismiss = async (reportId: string) => {
    try {
      await dismissReport(reportId);
      Alert.alert('Dismissed', 'Report has been dismissed.');
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const handleRemoveContent = async (report: ReportResponse) => {
    Alert.alert('Remove Content', 'This will hide the reported content from all users. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeReportedContent(report.id);
            Alert.alert('Removed', 'Content has been hidden.');
          } catch (error: unknown) {
            Alert.alert('Error', extractErrorMessage(error));
          }
        },
      },
    ]);
  };

  const renderReportItem = ({ item }: { item: ReportResponse }) => {
    const threadQuestionId = item.questionId ?? item.threadQuestionId;

    return (
      <GlassCard style={styles.reportCard}>
        {/* Report Header */}
        <View style={styles.reportHeader}>
          <View
            style={[
              styles.reasonBadge,
              { backgroundColor: `${REASON_COLORS[item.reason] || '#9E9E9E'}20` },
            ]}
          >
            <Text style={[styles.reasonText, { color: REASON_COLORS[item.reason] || '#9E9E9E' }]}>
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
        <View style={styles.contentInfoRow}>
          <View style={styles.reportIcon}>
            <Ionicons
              name={item.questionId ? 'help-circle-outline' : 'chatbubble-outline'}
              size={20}
              color={Colors.primary}
            />
          </View>
          <View style={styles.contentInfo}>
            <Text style={styles.contentType}>
              {item.questionId ? 'Question' : 'Comment'} Report
            </Text>
            <Text style={styles.reporterText}>Reported by {item.reporterName}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {(item.contentTitle || item.contentPreview) && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Reported Content</Text>
              {item.contentHidden && (
                <View style={styles.hiddenBadge}>
                  <Text style={styles.hiddenBadgeText}>Hidden</Text>
                </View>
              )}
            </View>
            {item.contentTitle ? (
              <Text style={styles.previewTitle}>{item.contentTitle}</Text>
            ) : null}
            {item.contentPreview ? (
              <Text style={styles.previewText} numberOfLines={4}>
                {item.contentPreview}
              </Text>
            ) : (
              <Text style={styles.previewPlaceholder}>Preview unavailable.</Text>
            )}
          </View>
        )}

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
              accessibilityRole="button"
              accessibilityLabel="Dismiss report"
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveContent(item)}
              accessibilityRole="button"
              accessibilityLabel="Remove reported content"
            >
              <Text style={styles.removeButtonText}>Remove Content</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Content Link */}
        <TouchableOpacity
          style={[styles.viewLink, !threadQuestionId && styles.viewLinkDisabled]}
          onPress={() => {
            if (threadQuestionId) {
              router.push({
                pathname: '/question/[id]',
                params: { id: threadQuestionId, whiteboardId },
              });
            }
          }}
          disabled={!threadQuestionId}
          accessibilityRole="button"
          accessibilityLabel="View reported content"
        >
          <Text style={styles.viewLinkText}>
            {item.questionId ? 'View Question' : 'Open Thread'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </GlassCard>
    );
  };

  return (
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader
          title="Moderation"
          subtitle="Reported content review"
          rightElement={<Text style={styles.pendingCount}>{pendingCount}</Text>}
        />

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {REPORT_STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => handleStatusFilter(filter.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${filter.label} reports`}
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
            contentContainerStyle={[styles.listContent, reports.length === 0 && styles.emptyList]}
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
                ionIcon="flag-outline"
                title={loadError ? 'Could not load reports' : 'No reports yet'}
                subtitle={loadError || 'There are no reported items to review'}
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
  pendingCount: {
    fontSize: Fonts.sizes.md,
    color: Colors.warning,
    fontWeight: '700',
    backgroundColor: 'rgba(255,193,7,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(187,39,68,0.25)',
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
  contentInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(187,39,68,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
    minWidth: 0,
  },
  previewContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hiddenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,68,68,0.16)',
  },
  hiddenBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  previewText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  previewPlaceholder: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
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
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  removeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.error,
  },
  viewLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  viewLinkDisabled: {
    opacity: 0.45,
  },
  viewLinkText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
