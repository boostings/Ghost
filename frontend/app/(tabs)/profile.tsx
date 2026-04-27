import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/ui/Avatar';
import { type AppColors, useThemeColors } from '../../constants/colors';
import { haptic } from '../../utils/haptics';
import { useAuthStore } from '../../stores/authStore';
import { questionService } from '../../services/questionService';
import { authService } from '../../services/authService';
import type { QuestionResponse } from '../../types';

const PAGE_SIZE = 10;

type Standing = {
  label: string;
  description: string;
  color: string;
  background: string;
  border: string;
};

function getStanding(karma: number, colors: AppColors): Standing {
  if (karma >= 100) {
    return {
      label: 'CHAMPION',
      description: 'Trusted contributor',
      color: '#FACC15',
      background: 'rgba(250,204,21,0.16)',
      border: 'rgba(250,204,21,0.40)',
    };
  }
  if (karma >= 25) {
    return {
      label: 'RISING',
      description: 'Building momentum',
      color: colors.success,
      background: `${colors.success}26`,
      border: `${colors.success}59`,
    };
  }
  if (karma >= 0) {
    return {
      label: 'MEMBER',
      description: 'Good standing',
      color: colors.info,
      background: `${colors.info}26`,
      border: `${colors.info}59`,
    };
  }
  return {
    label: 'NEEDS WORK',
    description: 'Add value with helpful posts',
    color: colors.error,
    background: `${colors.error}26`,
    border: `${colors.error}59`,
  };
}

function memberSince(createdAt: string | undefined): string {
  if (!createdAt) return '—';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(diffMs / 3600000);
  const day = Math.floor(diffMs / 86400000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);

  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const performLogout = useCallback(() => {
    haptic.medium();
    logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await authService.deleteAccount();
      logout();
      router.replace('/(auth)/login');
    } catch {
      const message = 'Could not delete your account. Please try again.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Error', message);
    } finally {
      setDeleting(false);
    }
  }, [logout, router]);

  const handleLogout = useCallback(() => {
    if (Platform.OS === 'web') {
      if (window.confirm('Log out of Ghost?')) performLogout();
      return;
    }
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: performLogout },
    ]);
  }, [performLogout]);

  const handleDelete = useCallback(() => {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Delete account permanently? All your questions, comments, and data will be removed.'
        )
      ) {
        void confirmDelete();
      }
      return;
    }
    Alert.alert(
      'Delete account',
      'This is permanent. All your questions, comments, and data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void confirmDelete() },
      ]
    );
  }, [confirmDelete]);

  const firstName = user?.firstName || 'You';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const role = user?.role || 'STUDENT';
  const karmaScore = user?.karmaScore ?? 0;
  const standing = getStanding(karmaScore, colors);

  const loadQuestions = useCallback(
    async (mode: 'replace' | 'append', requestedPage: number) => {
      if (mode === 'replace') setLoading(true);
      else setLoadingMore(true);
      try {
        const response = await questionService.getMyQuestions({
          page: requestedPage,
          size: PAGE_SIZE,
        });
        setQuestions((current) =>
          mode === 'replace' ? response.content : [...current, ...response.content]
        );
        setPage(requestedPage);
        setQuestionCount(response.totalElements);
        setHasMore(requestedPage + 1 < response.totalPages);
        setError(null);
      } catch {
        if (mode === 'replace') setQuestions([]);
        setHasMore(false);
        setError('Could not load your questions.');
      } finally {
        if (mode === 'replace') setLoading(false);
        else setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadQuestions('replace', 0);
  }, [loadQuestions]);

  // Refresh karma + question list whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const me = await authService.getMe();
          if (!cancelled) updateUser(me);
        } catch {
          // non-fatal, keep cached user
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [updateUser])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const me = await authService.getMe();
      updateUser(me);
    } catch {
      // ignore
    }
    await loadQuestions('replace', 0);
    setRefreshing(false);
  }, [loadQuestions, updateUser]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void loadQuestions('append', page + 1);
  }, [hasMore, loading, loadingMore, loadQuestions, page]);

  const renderQuestion = useCallback(
    ({ item, index }: { item: QuestionResponse; index: number }) => (
      <QuestionRow
        question={item}
        index={index}
        colors={colors}
        onPress={() => router.push(`/question/${item.id}`)}
      />
    ),
    [colors, router]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primary}24`, colors.background, colors.background] as const}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR SPACE</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          </View>
        </View>

        <FlatList
          data={questions}
          renderItem={renderQuestion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <Animated.View entering={FadeInDown.duration(460).delay(40).springify().damping(20)}>
                <View
                  style={[
                    styles.heroCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={[styles.heroEdge, { backgroundColor: colors.primary }]} />
                  <View style={styles.heroBody}>
                    <View style={styles.heroTop}>
                      <Avatar firstName={firstName} lastName={lastName} size={68} />
                      <View style={styles.heroNameBlock}>
                        <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View style={styles.heroChips}>
                          <View
                            style={[
                              styles.roleChip,
                              {
                                backgroundColor: colors.primarySoft,
                                borderColor: colors.primaryFaint,
                              },
                            ]}
                          >
                            <Ionicons
                              name={role === 'FACULTY' ? 'school' : 'person'}
                              size={11}
                              color={colors.primary}
                            />
                            <Text style={[styles.roleChipText, { color: colors.primary }]}>
                              {role}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.memberChip,
                              {
                                backgroundColor: colors.surfaceLight,
                                borderColor: colors.surfaceBorder,
                              },
                            ]}
                          >
                            <Text style={[styles.memberChipText, { color: colors.textMuted }]}>
                              SINCE {memberSince(user?.createdAt).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Text
                      style={[styles.heroEmail, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {user?.email ?? '—'}
                    </Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(460).delay(110).springify().damping(20)}>
                <View
                  style={[
                    styles.standingCard,
                    { backgroundColor: standing.background, borderColor: standing.border },
                  ]}
                >
                  <View style={styles.standingLeft}>
                    <Text style={[styles.standingLabel, { color: standing.color }]}>
                      {standing.label}
                    </Text>
                    <Text style={[styles.standingDesc, { color: colors.textSecondary }]}>
                      {standing.description}
                    </Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(460).delay(160).springify().damping(20)}
                style={styles.statsRow}
              >
                <StatTile
                  icon="help-circle-outline"
                  colors={colors}
                  value={loading ? '—' : questionCount.toLocaleString()}
                  label="Questions asked"
                />
                <StatTile
                  icon="flash-outline"
                  colors={colors}
                  value={karmaScore.toLocaleString()}
                  valueStyle={{
                    color: karmaScore > 0 ? colors.upvote : karmaScore < 0 ? colors.downvote : colors.text,
                  }}
                  label="Karma"
                />
                <StatTile
                  icon="ribbon-outline"
                  colors={colors}
                  value={standing.label.split(' ')[0]}
                  valueStyle={{ color: standing.color, fontSize: 16 }}
                  label="Standing"
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(460).delay(180).springify().damping(20)}
                style={styles.settingsBlock}
              >
                <Text style={[styles.blockEyebrow, { color: colors.text }]}>NOTIFICATIONS</Text>
                <View
                  style={[
                    styles.settingsCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={[styles.settingRail, { backgroundColor: colors.primary }]} />
                  <View style={styles.settingsCardBody}>
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          Push notifications
                        </Text>
                        <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                          Alerts for new answers and comments
                        </Text>
                      </View>
                      <Switch
                        value={pushEnabled}
                        onValueChange={(v) => {
                          haptic.selection();
                          setPushEnabled(v);
                        }}
                        trackColor={{
                          false: 'rgba(255,255,255,0.12)',
                          true: 'rgba(187,39,68,0.55)',
                        }}
                        thumbColor={pushEnabled ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View
                      style={[styles.settingDivider, { backgroundColor: colors.surfaceBorder }]}
                    />
                    <View style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          Email summaries
                        </Text>
                        <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                          Periodic digests of class activity
                        </Text>
                      </View>
                      <Switch
                        value={emailEnabled}
                        onValueChange={(v) => {
                          haptic.selection();
                          setEmailEnabled(v);
                        }}
                        trackColor={{
                          false: 'rgba(255,255,255,0.12)',
                          true: 'rgba(187,39,68,0.55)',
                        }}
                        thumbColor={emailEnabled ? colors.primary : colors.textMuted}
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(460).delay(220).springify().damping(20)}
                style={styles.settingsBlock}
              >
                <Text style={[styles.blockEyebrow, { color: colors.text }]}>ACCOUNT</Text>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => [
                      styles.actionButton,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.cardBorder,
                      },
                      pressed && { backgroundColor: colors.surfaceLight },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Log out"
                  >
                    <Ionicons name="log-out-outline" size={16} color={colors.text} />
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>Log out</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDelete}
                    disabled={deleting}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.actionButtonDanger,
                      {
                        backgroundColor: deleting ? `${colors.error}30` : `${colors.error}1F`,
                        borderColor: `${colors.error}66`,
                      },
                      pressed && { backgroundColor: `${colors.error}33` },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Delete account"
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    )}
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Delete account
                    </Text>
                  </Pressable>
                </View>
                <Text style={[styles.versionText, { color: colors.textMuted }]}>Ghost v1.0.0</Text>
              </Animated.View>

              <Animated.View
                entering={FadeIn.duration(280).delay(260)}
                style={styles.sectionHeader}
              >
                <Text style={[styles.sectionEyebrow, { color: colors.text }]}>YOUR QUESTIONS</Text>
                <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                  {loading ? 'Loading…' : `${questionCount.toLocaleString()} total`}
                </Text>
              </Animated.View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIcon,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primaryFaint,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {error ?? 'No questions yet'}
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  Ask your first question on a class whiteboard to see it here.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
        />
      </SafeAreaView>
    </View>
  );
}

function StatTile({
  icon,
  value,
  label,
  valueStyle,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  valueStyle?: object;
  colors: AppColors;
}) {
  return (
    <View
      style={[
        styles.statTile,
        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={[styles.statValue, { color: colors.text }, valueStyle]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function QuestionRow({
  question,
  index,
  onPress,
  colors,
}: {
  question: QuestionResponse;
  index: number;
  onPress: () => void;
  colors: AppColors;
}) {
  const isClosed = question.status === 'CLOSED';
  const statusColor = isClosed ? colors.primary : colors.openStatus;
  return (
    <Animated.View
      entering={FadeInDown.duration(360)
        .delay(Math.min(index, 6) * 40)
        .springify()
        .damping(20)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.questionRow,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          pressed && {
            backgroundColor: colors.surfaceLight,
            borderColor: colors.primarySoft,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open question ${question.title}`}
      >
        <View style={[styles.questionStatusEdge, { backgroundColor: statusColor }]} />
        <View style={styles.questionBody}>
          <View style={styles.questionTopRow}>
            <View
              style={[
                styles.questionStatusChip,
                {
                  backgroundColor: `${statusColor}26`,
                  borderColor: `${statusColor}59`,
                },
              ]}
            >
              <View
                style={[styles.questionStatusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.questionStatusText, { color: statusColor }]}>
                {question.status}
              </Text>
            </View>
            {question.topicName ? (
              <Text
                style={[styles.questionTopic, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {question.topicName}
              </Text>
            ) : null}
            <Text style={[styles.questionTime, { color: colors.textMuted }]}>
              {relativeTime(question.createdAt)}
            </Text>
          </View>
          <Text style={[styles.questionTitle, { color: colors.text }]} numberOfLines={2}>
            {question.title}
          </Text>
          <View style={styles.questionFooter}>
            <View style={styles.questionStat}>
              <Ionicons name="arrow-up" size={12} color={colors.textMuted} />
              <Text style={[styles.questionStatText, { color: colors.textMuted }]}>
                {question.karmaScore}
              </Text>
            </View>
            <View style={styles.questionStat}>
              <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.questionStatText, { color: colors.textMuted }]}>
                {question.commentCount}
              </Text>
            </View>
            {question.verifiedAnswerId ? (
              <View
                style={[
                  styles.verifiedChip,
                  { backgroundColor: `${colors.verifiedAnswer}26` },
                ]}
              >
                <Ionicons name="checkmark-circle" size={11} color={colors.verifiedAnswer} />
                <Text style={[styles.verifiedText, { color: colors.verifiedAnswer }]}>
                  ANSWERED
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
          style={styles.questionChevron}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 130 },

  heroCard: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  heroEdge: { width: 4 },
  heroBody: { flex: 1, padding: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroNameBlock: { flex: 1 },
  heroName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  heroChips: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  memberChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memberChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroEmail: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },

  standingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },
  standingLeft: { flex: 1 },
  standingLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  standingDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  standingRight: { alignItems: 'flex-end' },
  standingKarma: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  standingKarmaLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginTop: -2,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statTile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  settingsBlock: { marginBottom: 22 },
  blockEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  settingsCard: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  settingRail: { width: 3 },
  settingsCardBody: { flex: 1, padding: 14 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  settingDescription: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  settingDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionButtonDanger: {},
  actionButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  questionRow: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  questionStatusEdge: { width: 3 },
  questionBody: { flex: 1, padding: 14 },
  questionTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  questionStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  questionStatusDot: { width: 5, height: 5, borderRadius: 3 },
  questionStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  questionTopic: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  questionTime: { fontSize: 11, fontWeight: '700' },
  questionTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 8,
  },
  questionFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questionStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  questionStatText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  questionChevron: { alignSelf: 'center', marginRight: 12 },

  loadingState: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
