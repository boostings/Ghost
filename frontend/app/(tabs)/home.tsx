import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import GlassModal from '../../components/ui/GlassModal';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useAuthStore } from '../../stores/authStore';
import { whiteboardService } from '../../services/whiteboardService';
import { parseInviteCode } from '../../utils/inviteCode';
import type { WhiteboardResponse } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
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
  const lastFetchRef = useRef(0);
  const PAGE_SIZE = 20;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const fetchWhiteboards = useCallback(
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

        const response = await whiteboardService.list(nextPage, PAGE_SIZE);
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
      }
    },
    [hasMore, loadingMore, setLoading, setWhiteboards]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (whiteboards.length === 0 || isStale) {
        fetchWhiteboards({ page: 0, replace: true });
      }
    }, [fetchWhiteboards, whiteboards.length])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWhiteboards({ page: 0, replace: true });
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
    ({ item }: { item: WhiteboardResponse }) => (
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
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Text style={styles.courseCode}>{item.courseCode}</Text>
          </View>
          {item.isDemo && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          )}
        </View>

        <Text style={styles.courseName} numberOfLines={2}>
          {item.courseName}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>{'\u{1F4C5}'}</Text>
            <Text style={styles.metaText}>{item.semester}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>{'\u{1F465}'}</Text>
            <Text style={styles.metaText}>
              {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>
      </GlassCard>
    ),
    [router]
  );

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back{user ? `, ${user.firstName}` : ''}</Text>
          <Text style={styles.headerTitle}>Your Classes</Text>
        </View>
      </View>

      {/* Whiteboard List */}
      {isLoading && whiteboards.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={'\u{1F4DA}'}
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
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setShowJoinModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Join a class"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Join Modal */}
      <GlassModal
        visible={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setInviteCode('');
        }}
        title={isFaculty ? 'Join or Create Class' : 'Join a Class'}
      >
        <GlassInput
          label="Invite Code"
          placeholder="Enter class invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />

        <GlassButton
          title="Join Class"
          onPress={handleJoin}
          loading={joining}
          disabled={joining || !inviteCode.trim()}
        />

        <View style={styles.modalSpacing} />

        <GlassButton
          title="Scan QR Code"
          onPress={openScanner}
          variant="secondary"
          disabled={joining}
        />

        {isFaculty && (
          <>
            <View style={styles.modalDivider}>
              <View style={styles.modalDividerLine} />
              <Text style={styles.modalDividerText}>OR</Text>
              <View style={styles.modalDividerLine} />
            </View>
            <GlassButton
              title="Create New Whiteboard"
              onPress={() => {
                setShowJoinModal(false);
                router.push('/whiteboard/create');
              }}
              variant="secondary"
            />
          </>
        )}
      </GlassModal>

      <GlassModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        title="Scan Class QR"
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.scanner}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        </View>
        <Text style={styles.scannerHint}>Point your camera at the QR code shared by faculty.</Text>
      </GlassModal>
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
  greeting: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
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
  whiteboardCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeContainer: {
    backgroundColor: 'rgba(187,39,68,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  courseCode: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  demoBadge: {
    backgroundColor: 'rgba(255,187,51,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },
  courseName: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  metaText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(187,39,68,0.4)',
      },
      default: {
        elevation: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '300',
    marginTop: -2,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modalDividerText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  modalSpacing: {
    height: 10,
  },
  scannerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scanner: {
    width: '100%',
    height: 260,
  },
  scannerHint: {
    marginTop: 12,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
});
