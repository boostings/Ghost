import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { formatDate } from '../../utils/formatDate';
import { bookmarkService } from '../../services/bookmarkService';
import type { BookmarkResponse } from '../../types';

export default function BookmarksScreen() {
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastFetchRef = useRef(0);
  const PAGE_SIZE = 20;

  const fetchBookmarks = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
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

        const response = await bookmarkService.list(nextPage, PAGE_SIZE);
        setBookmarks((prev) => (replace ? response.content : [...prev, ...response.content]));
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        setLoadError(null);
        lastFetchRef.current = Date.now();
      } catch {
        if (replace) {
          setBookmarks([]);
        }
        setHasMore(false);
        setLoadError('Failed to load bookmarks. Pull down to retry.');
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [hasMore, loadingMore]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (bookmarks.length === 0 || isStale) {
        fetchBookmarks({ page: 0, replace: true });
      }
    }, [bookmarks.length, fetchBookmarks])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks({ page: 0, replace: true });
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading || loadingMore) {
      return;
    }
    await fetchBookmarks({ page: page + 1, replace: false });
  };

  const renderBookmark = ({ item }: { item: BookmarkResponse }) => {
    const question = item.question;
    return (
      <GlassCard
        style={styles.bookmarkCard}
        accessibilityLabel={`Open bookmarked question: ${question.title}`}
        onPress={() =>
          router.push({
            pathname: '/question/[id]',
            params: { id: question.id, whiteboardId: question.whiteboardId },
          })
        }
      >
        <View style={styles.cardHeader}>
          {question.topicName && <TopicBadge name={question.topicName} style={styles.topicBadge} />}
          <StatusBadge status={question.status} />
        </View>

        <Text style={styles.questionTitle} numberOfLines={2}>
          {question.title}
        </Text>

        <Text style={styles.questionBody} numberOfLines={2}>
          {question.isHidden ? '[hidden]' : question.body}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.authorText}>{question.authorName}</Text>
          <Text style={styles.dotSeparator}>{' \u00B7 '}</Text>
          <Text style={styles.dateText}>{formatDate(question.createdAt)}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.statText}>
              {'\u25B2'} {question.karmaScore}
            </Text>
            <Text style={styles.statText}>
              {'\u{1F4AC}'} {question.commentCount}
            </Text>
          </View>
        </View>

        <View style={styles.bookmarkMeta}>
          <Text style={styles.bookmarkedText}>Saved {formatDate(item.createdAt)}</Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        {bookmarks.length > 0 && <Text style={styles.countText}>{bookmarks.length} saved</Text>}
      </View>

      {/* Bookmark List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSkeleton type="question" count={4} />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, bookmarks.length === 0 && styles.emptyList]}
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
              icon={'\u2606'}
              title="No Saved Questions"
              subtitle={
                loadError ||
                "Bookmark questions you want to revisit. They'll appear here for easy access."
              }
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  countText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
  },
  bookmarkCard: {
    marginBottom: 12,
  },
  cardHeader: {
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  dotSeparator: {
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
    gap: 12,
  },
  statText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  bookmarkMeta: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bookmarkedText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
