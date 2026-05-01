import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import GlassModal from '../../components/ui/GlassModal';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { AnimatedIcon } from '../../components/AnimatedIcon';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease, Stagger, enterList } from '../../constants/motion';
import { Spacing, Shadow } from '../../constants/spacing';
import { haptic } from '../../utils/haptics';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { whiteboardService } from '../../services/whiteboardService';
import { questionService } from '../../services/questionService';
import { extractErrorMessage } from '../../hooks/useApi';
import { parseInviteCode } from '../../utils/inviteCode';
import { getCourseVisual, visualColors } from '../../utils/courseIcon';
import type { QuestionResponse, WhiteboardResponse } from '../../types';

const WHITEBOARD_PAGE_SIZE = 20;
const MY_QUESTIONS_STRIP_SIZE = 10;

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const whiteboards = useWhiteboardStore((state) => state.whiteboards);
  const setWhiteboards = useWhiteboardStore((state) => state.setWhiteboards);
  const setLoading = useWhiteboardStore((state) => state.setLoading);
  const isLoading = useWhiteboardStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const latestNotification = useNotificationStore((state) => state.notifications[0]);
  const isFaculty = user?.role === 'FACULTY';

  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllAwaiting, setShowAllAwaiting] = useState(false);
  const [showAllAnswered, setShowAllAnswered] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [awaitingQuestions, setAwaitingQuestions] = useState<QuestionResponse[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<QuestionResponse[]>([]);
  const lastFetchRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const scannerLockedRef = useRef(false);
  const scannerUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    return () => {
      if (scannerUnlockTimerRef.current) {
        clearTimeout(scannerUnlockTimerRef.current);
      }
    };
  }, []);

  const fetchWhiteboards = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (requestInFlightRef.current) {
        return;
      }

      if (!replace && (!hasMore || loadingMore)) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        if (replace) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await whiteboardService.list(nextPage, WHITEBOARD_PAGE_SIZE);
        const current = replace ? [] : useWhiteboardStore.getState().whiteboards;
        const merged = [...current, ...response.content];
        setWhiteboards(merged);
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        lastFetchRef.current = Date.now();
        setLoadError(null);
      } catch {
        setLoadError('Failed to load your classes. Pull down to retry.');
        if (replace) {
          setWhiteboards([]);
        }
        setHasMore(false);
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
        requestInFlightRef.current = false;
      }
    },
    [hasMore, loadingMore, setLoading, setWhiteboards]
  );

  const fetchMyQuestions = useCallback(async () => {
    const role = isFaculty ? 'TEACHING' : 'AUTHOR';
    try {
      const [awaitingResp, answeredResp] = await Promise.all([
        questionService.getMyQuestions({
          role,
          status: 'AWAITING',
          page: 0,
          size: MY_QUESTIONS_STRIP_SIZE,
        }),
        questionService.getMyQuestions({
          role,
          status: 'ANSWERED',
          page: 0,
          size: MY_QUESTIONS_STRIP_SIZE,
        }),
      ]);
      setAwaitingQuestions(awaitingResp.content);
      setAnsweredQuestions(answeredResp.content);
    } catch {
      // Silent: strips are supplementary; whiteboard list still works.
      setAwaitingQuestions([]);
      setAnsweredQuestions([]);
    }
  }, [isFaculty]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (whiteboards.length === 0 || isStale) {
        fetchWhiteboards({ page: 0, replace: true });
      }
      fetchMyQuestions();
    }, [fetchMyQuestions, fetchWhiteboards, whiteboards.length])
  );

  useEffect(() => {
    if (
      latestNotification?.type === 'QUESTION_ANSWERED' ||
      latestNotification?.type === 'COMMENT_ADDED'
    ) {
      void fetchMyQuestions();
    }
  }, [fetchMyQuestions, latestNotification?.id, latestNotification?.type]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWhiteboards({ page: 0, replace: true }), fetchMyQuestions()]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || isLoading) {
      return;
    }
    await fetchWhiteboards({ page: page + 1, replace: false });
  };

  const joinWithInviteCode = async (code: string) => {
    setJoining(true);
    try {
      await whiteboardService.joinByInviteCode(code);
      setShowJoinModal(false);
      setInviteCode('');
      await fetchWhiteboards({ page: 0, replace: true });
    } catch (error: unknown) {
      Alert.alert('Join Failed', extractErrorMessage(error));
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    await joinWithInviteCode(inviteCode.trim());
  };

  const closeJoinModal = () => {
    setShowJoinModal(false);
    setInviteCode('');
  };

  const closeScanner = () => {
    if (scannerUnlockTimerRef.current) {
      clearTimeout(scannerUnlockTimerRef.current);
      scannerUnlockTimerRef.current = null;
    }
    scannerLockedRef.current = false;
    setScannerLocked(false);
    setShowScannerModal(false);
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const permissionResponse = await requestCameraPermission();
      if (!permissionResponse.granted) {
        Alert.alert('Camera Permission Needed', 'Enable camera access to scan class QR codes.');
        return;
      }
    }

    scannerLockedRef.current = false;
    setScannerLocked(false);
    if (showJoinModal) {
      setShowJoinModal(false);
      InteractionManager.runAfterInteractions(() => {
        setShowScannerModal(true);
      });
      return;
    }

    setShowScannerModal(true);
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scannerLockedRef.current || scannerLocked || joining) {
      return;
    }

    scannerLockedRef.current = true;
    setScannerLocked(true);
    const parsedCode = parseInviteCode(data);
    if (!parsedCode) {
      Alert.alert('Invalid QR Code', 'This QR code does not contain a valid invite code.');
      if (scannerUnlockTimerRef.current) {
        clearTimeout(scannerUnlockTimerRef.current);
      }
      scannerUnlockTimerRef.current = setTimeout(() => {
        scannerUnlockTimerRef.current = null;
        scannerLockedRef.current = false;
        setScannerLocked(false);
      }, 600);
      return;
    }

    closeScanner();
    setInviteCode(parsedCode);
    await joinWithInviteCode(parsedCode);
    scannerLockedRef.current = false;
    setScannerLocked(false);
  };

  const renderWhiteboardCard = useCallback(
    ({ item, index }: { item: WhiteboardResponse; index: number }) => (
      <Animated.View
        entering={enterList(index)}
        layout={LinearTransition.duration(Duration.normal).easing(Ease.out)}
      >
        <GlassCard
          style={styles.whiteboardCard}
          highlight={false}
          accessibilityLabel={`Open ${item.courseCode} whiteboard`}
          onPress={() =>
            router.push({
              pathname: '/whiteboard/[id]',
              params: { id: item.id },
            })
          }
        >
          {(() => {
            const visual = getCourseVisual(item.courseCode);
            const tint = visualColors(visual);
            return (
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconDisc,
                    { backgroundColor: tint.background, borderColor: tint.border },
                  ]}
                >
                  <AnimatedIcon
                    name={visual.icon}
                    size={18}
                    color={tint.foreground}
                    motion="none"
                  />
                </View>
                {item.isDemo ? (
                  <View
                    style={[
                      styles.demoBadge,
                      {
                        backgroundColor: `${colors.warning}26`,
                        borderColor: `${colors.warning}40`,
                      },
                    ]}
                  >
                    <Text style={[styles.demoBadgeText, { color: colors.warning }]}>DEMO</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.codeContainer,
                      { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
                    ]}
                  >
                    <Text style={[styles.courseCode, { color: colors.primary }]}>
                      {item.courseCode}
                    </Text>
                  </View>
                )}
                <View style={styles.chevronWrap}>
                  <AnimatedIcon
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                    motion="none"
                  />
                </View>
              </View>
            );
          })()}

          <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
            {item.courseName}
          </Text>

          {item.ownerName ? (
            <View style={styles.teacherRow}>
              <AnimatedIcon
                name="school-outline"
                size={14}
                color={colors.textMuted}
                motion="none"
              />
              <Text style={[styles.teacherText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.ownerName}
              </Text>
            </View>
          ) : null}

          <View style={[styles.cardFooter, { borderTopColor: colors.surfaceBorder }]}>
            <View style={styles.metaItem}>
              <AnimatedIcon
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
                motion="none"
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.semester}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <AnimatedIcon
                name="people-outline"
                size={14}
                color={colors.textMuted}
                motion="none"
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    ),
    [colors, router]
  );

  const navigateToQuestion = useCallback(
    (question: QuestionResponse) => {
      router.push({ pathname: '/question/[id]', params: { id: question.id } });
    },
    [router]
  );

  const renderMyQuestionStrip = (
    title: string,
    variant: 'awaiting' | 'answered',
    items: QuestionResponse[]
  ) => {
    if (items.length === 0) return null;
    const expanded = variant === 'awaiting' ? showAllAwaiting : showAllAnswered;
    const visibleItems = expanded ? items : items.slice(0, 3);
    const remaining = items.length - 3;
    const toggle = () =>
      variant === 'awaiting' ? setShowAllAwaiting((v) => !v) : setShowAllAnswered((v) => !v);

    const isAnswered = variant === 'answered';
    const accent = isAnswered ? colors.verifiedAnswer : colors.warning;

    return (
      <View style={styles.stripBlock}>
        <Text style={[styles.stripTitle, { color: colors.text }]}>{title}</Text>
        <View
          style={[
            styles.questionRowGroup,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          {visibleItems.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() => navigateToQuestion(item)}
              style={({ pressed }) => [
                styles.questionRow,
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.surfaceBorder,
                },
                pressed && { backgroundColor: colors.surfaceLight },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open question: ${item.title}`}
            >
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <View style={styles.questionRowBody}>
                <Text style={[styles.questionRowTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.questionRowMeta, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {[
                    item.whiteboardCourseCode,
                    item.commentCount > 0
                      ? `${item.commentCount} ${item.commentCount === 1 ? 'reply' : 'replies'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <AnimatedIcon
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
                motion="none"
              />
            </Pressable>
          ))}
        </View>
        {items.length > 3 ? (
          <Pressable
            onPress={toggle}
            style={({ pressed }) => [styles.loadMoreButton, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show fewer' : `Show ${remaining} more`}
          >
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
              {expanded ? 'Show fewer' : `Show ${remaining} more`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const awaitingTitle = isFaculty ? 'Recently asked' : 'Awaiting an answer';
  const answeredTitle = 'Recently answered';
  const myQuestionsHeader = (
    <Animated.View
      entering={FadeInDown.duration(Duration.normal).delay(Stagger.hero).easing(Ease.out)}
    >
      {renderMyQuestionStrip(awaitingTitle, 'awaiting', awaitingQuestions)}
      {!isFaculty ? renderMyQuestionStrip(answeredTitle, 'answered', answeredQuestions) : null}
      {whiteboards.length > 0 ? (
        <Text style={[styles.classesHeading, { color: colors.text }]}>Your Classes</Text>
      ) : null}
    </Animated.View>
  );

  let joinModalTitle = 'Join a Class';
  if (isFaculty) {
    joinModalTitle = 'Join or Create Class';
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primary}24`, colors.background, colors.background] as const}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View
          style={styles.header}
          entering={FadeInDown.duration(Duration.normal).easing(Ease.out)}
        >
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              {user ? `WELCOME BACK, ${user.firstName.toUpperCase()}` : 'WELCOME BACK'}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
          </View>
          <Pressable
            onPress={() => {
              haptic.medium();
              setShowJoinModal(true);
            }}
            style={({ pressed }) => [
              styles.headerFab,
              { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.95 : 1 }] },
              Shadow.primaryGlow(colors.primary),
            ]}
            accessibilityRole="button"
            accessibilityLabel="Join a class"
          >
            <AnimatedIcon name="add" size={24} color="#FFFFFF" motion="pop" />
          </Pressable>
        </Animated.View>

        {isLoading && whiteboards.length === 0 ? (
          <View style={styles.loadingContainer}>
            <LoadingSkeleton type="question" count={3} />
          </View>
        ) : (
          <FlatList
            data={whiteboards}
            renderItem={renderWhiteboardCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              whiteboards.length === 0 && styles.emptyList,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={myQuestionsHeader}
            ListEmptyComponent={
              <EmptyState
                ionIcon="library-outline"
                title="No Classes Yet"
                subtitle={loadError || 'Join a class to start asking and answering questions'}
                actionLabel="Join a Class"
                onAction={() => setShowJoinModal(true)}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}

        <GlassModal visible={showJoinModal} onClose={closeJoinModal} title={joinModalTitle}>
          <GlassInput
            label="Invite Code"
            placeholder="Enter class invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            showClear
          />

          <GlassButton
            title="Join Class"
            onPress={handleJoin}
            loading={joining}
            disabled={joining || !inviteCode.trim()}
            solid
            icon={<AnimatedIcon name="enter-outline" size={18} color="#FFFFFF" motion="pop" />}
          />

          <View style={styles.modalSpacing} />

          <GlassButton
            title="Scan QR Code"
            onPress={openScanner}
            variant="secondary"
            disabled={joining}
            icon={
              <AnimatedIcon name="qr-code-outline" size={18} color={colors.text} motion="pop" />
            }
          />

          {isFaculty && (
            <>
              <View style={styles.modalDivider}>
                <View
                  style={[styles.modalDividerLine, { backgroundColor: colors.surfaceBorder }]}
                />
                <Text style={[styles.modalDividerText, { color: colors.textMuted }]}>OR</Text>
                <View
                  style={[styles.modalDividerLine, { backgroundColor: colors.surfaceBorder }]}
                />
              </View>
              <GlassButton
                title="Create From Class Catalog"
                onPress={() => {
                  closeJoinModal();
                  router.push('/whiteboard/catalog');
                }}
                variant="secondary"
                icon={
                  <AnimatedIcon name="book-outline" size={18} color={colors.text} motion="pop" />
                }
              />
            </>
          )}
        </GlassModal>

        <GlassModal visible={showScannerModal} onClose={closeScanner} title="Scan Class QR">
          <View
            style={[
              styles.scannerContainer,
              { borderColor: colors.surfaceBorder, backgroundColor: colors.surface },
            ]}
          >
            <CameraView
              style={styles.scanner}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          </View>
          <Text style={[styles.scannerHint, { color: colors.textMuted }]}>
            Point your camera at the QR code shared by faculty.
          </Text>
        </GlassModal>
      </SafeAreaView>
    </View>
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
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 160,
  },
  stripBlock: {
    marginBottom: Spacing.xl,
  },
  stripTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: Spacing.sm,
  },
  questionRowGroup: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  questionRowBody: {
    flex: 1,
    minWidth: 0,
  },
  questionRowTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  questionRowMeta: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  loadMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  classesHeading: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: Spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
  },
  whiteboardCard: {
    marginBottom: Spacing.lg,
    ...Shadow.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeContainer: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  courseCode: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  demoBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chevronWrap: {
    marginLeft: 'auto',
  },
  courseName: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: Fonts.sizes.xl + 6,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  teacherText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: Fonts.sizes.sm,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  modalDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  modalDividerText: {
    fontSize: Fonts.sizes.sm,
    paddingHorizontal: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  modalSpacing: {
    height: 10,
  },
  scannerContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  scanner: {
    width: '100%',
    height: 260,
  },
  scannerHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: Fonts.sizes.sm,
  },
});
