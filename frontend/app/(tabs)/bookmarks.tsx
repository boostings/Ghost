import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { formatDate } from '../../utils/formatDate';
import api from '../../services/api';
import type { BookmarkResponse } from '../../types';

export default function BookmarksScreen() {
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    try {
      const response = await api.get('/bookmarks', { params: { page: 0, size: 50 } });
      setBookmarks(response.data.content || response.data || []);
    } catch {
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [fetchBookmarks])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks();
    setRefreshing(false);
  };

  const renderBookmark = ({ item }: { item: BookmarkResponse }) => {
    const question = item.question;
    return (
      <GlassCard
        style={styles.bookmarkCard}
        onPress={() =>
          router.push(
            `/question/${question.id}?whiteboardId=${question.whiteboardId}`
          )
        }
      >
        <View style={styles.cardHeader}>
          {question.topicName && (
            <TopicBadge name={question.topicName} style={styles.topicBadge} />
          )}
          <StatusBadge status={question.status} />
        </View>

        <Text style={styles.questionTitle} numberOfLines={2}>
          {question.title}
        </Text>

        <Text style={styles.questionBody} numberOfLines={2}>
          {question.body}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.authorText}>{question.authorName}</Text>
          <Text style={styles.dotSeparator}>{" \u00B7 "}</Text>
          <Text style={styles.dateText}>{formatDate(question.createdAt)}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.statText}>
              {"\u25B2"} {question.karmaScore}
            </Text>
            <Text style={styles.statText}>
              {"\u{1F4AC}"} {question.commentCount}
            </Text>
          </View>
        </View>

        <View style={styles.bookmarkMeta}>
          <Text style={styles.bookmarkedText}>
            Saved {formatDate(item.createdAt)}
          </Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bookmarks</Text>
          {bookmarks.length > 0 && (
            <Text style={styles.countText}>
              {bookmarks.length} saved
            </Text>
          )}
        </View>

        {/* Bookmark List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={bookmarks}
            renderItem={renderBookmark}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              bookmarks.length === 0 && styles.emptyList,
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
                icon={"\u2606"}
                title="No Saved Questions"
                subtitle="Bookmark questions you want to revisit. They'll appear here for easy access."
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
    justifyContent: 'center',
    alignItems: 'center',
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
});
