import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, LinearTransition } from 'react-native-reanimated';
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
import { Duration, Stagger, enterList } from '../../constants/motion';
import { Spacing, Shadow } from '../../constants/spacing';
import { haptic } from '../../utils/haptics';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useAuthStore } from '../../stores/authStore';
import { whiteboardService } from '../../services/whiteboardService';
import { questionService } from '../../services/questionService';
import { parseInviteCode } from '../../utils/inviteCode';
import { getCourseVisual, visualColors } from '../../utils/courseIcon';
import { MyQuestionCard } from '../../components/MyQuestionCard';
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
  const isFaculty = user?.role === 'FACULTY';

  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [awaitingQuestions, setAwaitingQuestions] = useState<QuestionResponse[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<QuestionResponse[]>([]);
  const lastFetchRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
    } catch {
      Alert.alert('Join Failed', 'Unable to join with this invite code.');
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

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const permissionResponse = await requestCameraPermission();
      if (!permissionResponse.granted) {
        Alert.alert('Camera Permission Needed', 'Enable camera access to scan class QR codes.');
        return;
      }
    }

    setScannerLocked(false);
    setShowScannerModal(true);
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scannerLocked || joining) {
      return;
    }

    setScannerLocked(true);
    const parsedCode = parseInviteCode(data);
    if (!parsedCode) {
      Alert.alert('Invalid QR Code', 'This QR code does not contain a valid invite code.');
      setTimeout(() => setScannerLocked(false), 600);
      return;
    }

    setShowScannerModal(false);
    setInviteCode(parsedCode);
    await joinWithInviteCode(parsedCode);
    setScannerLocked(false);
  };

  const renderWhiteboardCard = useCallback(
    ({ item, index }: { item: WhiteboardResponse; index: number }) => (
      <Animated.View entering={enterList(index)} layout={LinearTransition.springify().damping(20)}>
        <GlassCard
          style={styles.whiteboardCard}
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
                {item.isDemo && (
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

          <View style={[styles.cardFooter, { borderTopColor: colors.surfaceBorder }]}>
            <View style={styles.metaItem}>
              <AnimatedIcon
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
                motion="none"
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.semester}</Text>
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
    return (
      <View style={styles.stripBlock}>
        <Text style={[styles.stripTitle, { color: colors.text }]}>{title}</Text>
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripList}
          ItemSeparatorComponent={() => <View style={styles.stripSeparator} />}
          renderItem={({ item }) => (
            <MyQuestionCard question={item} variant={variant} onPress={navigateToQuestion} />
          )}
        />
      </View>
    );
  };

  const awaitingTitle = isFaculty ? 'Awaiting your answer' : 'Awaiting an answer';
  const answeredTitle = isFaculty ? 'Recently answered in your classes' : 'Recently answered';
  const myQuestionsHeader = (
    <Animated.View
      entering={FadeInDown.duration(Duration.normal).delay(Stagger.hero).springify().damping(22)}
    >
      {renderMyQuestionStrip(awaitingTitle, 'awaiting', awaitingQuestions)}
      {renderMyQuestionStrip(answeredTitle, 'answered', answeredQuestions)}
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
        entering={FadeInDown.duration(Duration.hero).delay(Stagger.hero).springify().damping(22)}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {user ? `WELCOME BACK, ${user.firstName.toUpperCase()}` : 'WELCOME BACK'}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
        </View>
        <Image
          source={require('../../public/logo.png')}
          style={[styles.headerLogo, { tintColor: colors.text }]}
          resizeMode="contain"
          accessibilityLabel="Ghost logo"
        />
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
          contentContainerStyle={[styles.listContent, whiteboards.length === 0 && styles.emptyList]}
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

      <Animated.View
        style={styles.fabWrap}
        entering={FadeInUp.duration(Duration.slow).delay(Stagger.footer).springify().damping(14)}
      >
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.95 : 1 }] },
            Shadow.primaryGlow(colors.primary),
          ]}
          onPress={() => {
            haptic.medium();
            setShowJoinModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Join a class"
        >
          <AnimatedIcon name="add" size={28} color="#FFFFFF" motion="pop" />
        </Pressable>
      </Animated.View>

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
              <View style={[styles.modalDividerLine, { backgroundColor: colors.surfaceBorder }]} />
              <Text style={[styles.modalDividerText, { color: colors.textMuted }]}>OR</Text>
              <View style={[styles.modalDividerLine, { backgroundColor: colors.surfaceBorder }]} />
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

      <GlassModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        title="Scan Class QR"
      >
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
  headerLogo: {
    width: 52,
    height: 52,
    marginLeft: 12,
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
  stripList: {
    paddingRight: Spacing.xxl,
  },
  stripSeparator: {
    width: Spacing.md,
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
    marginBottom: 14,
    letterSpacing: -0.3,
    lineHeight: Fonts.sizes.xl + 6,
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
  fabWrap: {
    position: 'absolute',
    right: Spacing.xxl,
    bottom: 110,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
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
