import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { whiteboardService } from '../../services/whiteboardService';
import { questionService } from '../../services/questionService';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse, WhiteboardResponse } from '../../types';

export default function WhiteboardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { setCurrentWhiteboard } = useWhiteboardStore();

  const [whiteboard, setWhiteboard] = useState<WhiteboardResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isFaculty = user?.role === 'FACULTY';
  const isOwner = whiteboard?.ownerId === user?.id;

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [wb, qs] = await Promise.all([
        whiteboardService.getById(id),
        questionService.list(id, { page: 0, size: 50, sort: 'recent' }),
      ]);
      setWhiteboard(wb);
      setCurrentWhiteboard(wb);
      setQuestions(qs.content);
    } catch {
      setWhiteboard(null);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const pinnedQuestions = questions.filter((q) => q.isPinned);
  const regularQuestions = questions.filter((q) => !q.isPinned);

  const renderQuestionCard = ({ item }: { item: QuestionResponse }) => (
    <GlassCard
      style={[styles.questionCard, item.isPinned && styles.pinnedCard]}
      onPress={() => router.push(`/question/${item.id}?whiteboardId=${id}`)}
    >
      {item.isPinned && (
        <View style={styles.pinnedBanner}>
          <Text style={styles.pinnedIcon}>{"\u{1F4CC}"}</Text>
          <Text style={styles.pinnedText}>PINNED</Text>
        </View>
      )}

      <View style={styles.questionHeader}>
        {item.topicName && (
          <TopicBadge name={item.topicName} style={styles.topicBadge} />
        )}
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.questionTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.questionBody} numberOfLines={3}>
        {item.body}
      </Text>

      <View style={styles.questionFooter}>
        <Text style={styles.authorText}>{item.authorName}</Text>
        <Text style={styles.dotSep}>{" \u00B7 "}</Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        <View style={styles.footerRight}>
          <Text
            style={[
              styles.karmaText,
              item.karmaScore > 0 && styles.karmaPositive,
              item.karmaScore < 0 && styles.karmaNegative,
            ]}
          >
            {"\u25B2"} {item.karmaScore}
          </Text>
          <Text style={styles.commentText}>
            {"\u{1F4AC}"} {item.commentCount}
          </Text>
          {item.verifiedAnswerId && (
            <Text style={styles.verifiedText}>{"\u2705"}</Text>
          )}
        </View>
      </View>
    </GlassCard>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

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

          <View style={styles.headerCenter}>
            <Text style={styles.courseCode}>{whiteboard?.courseCode || ''}</Text>
            <Text style={styles.courseName} numberOfLines={1}>
              {whiteboard?.courseName || ''}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push(`/whiteboard/members?whiteboardId=${id}`)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonIcon}>{"\u{1F465}"}</Text>
            </TouchableOpacity>
            {isFaculty && (
              <TouchableOpacity
                onPress={() => router.push(`/whiteboard/settings?whiteboardId=${id}`)}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonIcon}>{"\u2699\uFE0F"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Question Feed */}
        <FlatList
          data={[...pinnedQuestions, ...regularQuestions]}
          renderItem={renderQuestionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            questions.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            pinnedQuestions.length > 0 ? (
              <Text style={styles.sectionLabel}>
                {pinnedQuestions.length} Pinned
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={"\u2753"}
              title="No Questions Yet"
              subtitle="Be the first to ask a question in this class!"
              actionLabel="Ask a Question"
              onAction={() => router.push(`/question/create?whiteboardId=${id}`)}
            />
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => router.push(`/question/create?whiteboardId=${id}`)}
        >
          <Text style={styles.fabIcon}>{"+ Ask"}</Text>
        </TouchableOpacity>
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
  headerCenter: {
    flex: 1,
  },
  courseCode: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  courseName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  questionCard: {
    marginBottom: 12,
  },
  pinnedCard: {
    borderColor: 'rgba(255,187,51,0.3)',
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  pinnedText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  topicBadge: {
    marginRight: 4,
  },
  questionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  questionBody: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  dotSep: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
  dateText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  karmaText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  karmaPositive: {
    color: Colors.success,
  },
  karmaNegative: {
    color: Colors.error,
  },
  commentText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  verifiedText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabIcon: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '700',
  },
});
