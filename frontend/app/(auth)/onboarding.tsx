import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import GlassModal from '../../components/ui/GlassModal';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease, Stagger, enterList } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { whiteboardService } from '../../services/whiteboardService';
import { useAuthStore } from '../../stores/authStore';
import { extractErrorMessage } from '../../hooks/useApi';
import { parseInviteCode } from '../../utils/inviteCode';
import type { WhiteboardResponse } from '../../types';

const DEMO_INVITE_CODE = 'DEMO2026';

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthStore((state) => state.user);

  const [inviteCode, setInviteCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joiningDemo, setJoiningDemo] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [joinedClasses, setJoinedClasses] = useState<WhiteboardResponse[]>([]);
  const [availableClasses, setAvailableClasses] = useState<WhiteboardResponse[]>([]);
  const [requestedClassIds, setRequestedClassIds] = useState<string[]>([]);
  const [requestingClassIds, setRequestingClassIds] = useState<string[]>([]);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scannerUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchClasses = async () => {
    setLoadingClasses(true);

    const [joinedResult, discoverableResult] = await Promise.allSettled([
      whiteboardService.list(0, 20),
      whiteboardService.listDiscoverable(0, 20),
    ]);

    if (joinedResult.status === 'fulfilled') {
      setJoinedClasses(joinedResult.value.content);
    } else {
      setJoinedClasses([]);
    }

    if (discoverableResult.status === 'fulfilled') {
      const nonDemoWhiteboards = discoverableResult.value.content.filter(
        (whiteboard) => !whiteboard.isDemo
      );
      setAvailableClasses(nonDemoWhiteboards);
      setRequestedClassIds((prev) =>
        prev.filter((id) => nonDemoWhiteboards.some((whiteboard) => whiteboard.id === id))
      );
    } else {
      setAvailableClasses([]);
      setRequestedClassIds([]);
    }

    setLoadingClasses(false);
  };

  useEffect(() => {
    fetchClasses();
    return () => {
      if (scannerUnlockTimerRef.current) {
        clearTimeout(scannerUnlockTimerRef.current);
      }
    };
  }, []);

  const joinWithCode = async (code: string): Promise<void> => {
    await whiteboardService.joinByInviteCode(code.trim());
    await fetchClasses();
  };

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code.');
      return;
    }

    setJoiningByCode(true);
    try {
      await joinWithCode(inviteCode);
      setInviteCode('');
      Alert.alert('Joined', 'Class joined successfully.');
    } catch (error: unknown) {
      Alert.alert('Join Failed', extractErrorMessage(error));
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleJoinDemo = async () => {
    setJoiningDemo(true);
    try {
      await joinWithCode(DEMO_INVITE_CODE);
      Alert.alert('Joined', 'Demo class joined successfully.');
    } catch (error: unknown) {
      Alert.alert('Join Failed', extractErrorMessage(error));
    } finally {
      setJoiningDemo(false);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)/home');
  };

  const handleRequestJoin = async (whiteboard: WhiteboardResponse) => {
    if (requestingClassIds.includes(whiteboard.id) || requestedClassIds.includes(whiteboard.id)) {
      return;
    }

    setRequestingClassIds((prev) => [...prev, whiteboard.id]);
    try {
      await whiteboardService.requestToJoin(whiteboard.id);
      setRequestedClassIds((prev) => [...prev, whiteboard.id]);
      Alert.alert(
        'Request Sent',
        `Your request to join ${whiteboard.courseCode} was sent to faculty.`
      );
    } catch (error: unknown) {
      Alert.alert('Request Failed', extractErrorMessage(error));
    } finally {
      setRequestingClassIds((prev) => prev.filter((id) => id !== whiteboard.id));
    }
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
    if (scannerLocked || joiningByCode || joiningDemo) {
      return;
    }

    setScannerLocked(true);
    const parsedCode = parseInviteCode(data);
    if (!parsedCode) {
      Alert.alert('Invalid QR Code', 'This QR code does not contain a valid invite code.');
      if (scannerUnlockTimerRef.current) {
        clearTimeout(scannerUnlockTimerRef.current);
      }
      scannerUnlockTimerRef.current = setTimeout(() => setScannerLocked(false), 600);
      return;
    }

    setShowScannerModal(false);
    setInviteCode(parsedCode);

    try {
      await joinWithCode(parsedCode);
      Alert.alert('Joined', 'Class joined successfully.');
    } catch (error: unknown) {
      Alert.alert('Join Failed', extractErrorMessage(error));
    } finally {
      setScannerLocked(false);
    }
  };

  const hasJoinedAtLeastOne = joinedClasses.length > 0;
  const demoJoined = joinedClasses.some((whiteboard) => whiteboard.isDemo);
  const isFaculty = user?.role === 'FACULTY';

  return (
    <LinearGradient colors={colors.bgGradient} style={styles.gradient}>
      <View
        style={[styles.ambient, { backgroundColor: `${colors.primary}1A` }]}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={styles.header}
            entering={FadeInDown.duration(Duration.hero).delay(Stagger.hero)}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
              ]}
            >
              <Ionicons name="sparkles" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Welcome to Ghost</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join at least one class to get started
            </Text>
          </Animated.View>

          <GlassCard
            style={styles.card}
            entering={FadeInDown.duration(Duration.normal)
              .delay(Stagger.card)
              .easing(Ease.out)}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>Join a Class</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Enter the invite code shared by your instructor
            </Text>

            <GlassInput
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleJoinWithCode}
            />

            <GlassButton
              title="Join Class"
              onPress={handleJoinWithCode}
              loading={joiningByCode}
              disabled={joiningByCode || joiningDemo || !inviteCode.trim()}
              solid
            />

            <Pressable
              style={[styles.optionRow, { borderTopColor: colors.surfaceBorder }]}
              onPress={openScanner}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Scan QR Code</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                  Use your camera to scan the class QR code
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            {isFaculty ? (
              <Pressable
                style={[styles.optionRow, { borderTopColor: colors.surfaceBorder }]}
                onPress={() => router.push('/whiteboard/catalog')}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="book-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Create From Class Catalog
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                    Pick your class and open its whiteboard
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </GlassCard>

          <GlassCard
            style={styles.card}
            entering={FadeInDown.duration(Duration.hero)
              .delay(Stagger.card + 80)
              .easing(Ease.out)}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>Available Classes</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Request access to class whiteboards managed by faculty.
            </Text>

            {loadingClasses ? (
              <View style={styles.loadingClassesRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingClassesText, { color: colors.textMuted }]}>
                  Loading classes…
                </Text>
              </View>
            ) : availableClasses.length === 0 ? (
              <Text style={[styles.emptyClassesText, { color: colors.textMuted }]}>
                No discoverable classes right now. Use an invite code or QR to join.
              </Text>
            ) : (
              availableClasses.map((whiteboard, index) => {
                const requesting = requestingClassIds.includes(whiteboard.id);
                const requested = requestedClassIds.includes(whiteboard.id);

                return (
                  <Animated.View
                    key={whiteboard.id}
                    entering={enterList(index)}
                    style={[
                      styles.classRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfaceBorder,
                      },
                    ]}
                  >
                    <View style={styles.classMeta}>
                      <Text style={[styles.classCode, { color: colors.primary }]}>
                        {whiteboard.courseCode}
                      </Text>
                      <Text style={[styles.className, { color: colors.text }]} numberOfLines={1}>
                        {whiteboard.courseName}
                      </Text>
                    </View>
                    <View style={styles.classAction}>
                      <Text style={[styles.classSemester, { color: colors.textSecondary }]}>
                        {whiteboard.semester}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.classActionButton,
                          {
                            borderColor: colors.primarySoft,
                            backgroundColor: requested ? colors.surfaceLight : colors.primarySoft,
                          },
                          requested && { borderColor: colors.surfaceBorder },
                        ]}
                        onPress={() => handleRequestJoin(whiteboard)}
                        disabled={requesting || requested}
                      >
                        <Text
                          style={[
                            styles.classActionButtonText,
                            { color: requested ? colors.textSecondary : colors.primary },
                          ]}
                        >
                          {requested ? 'Requested' : requesting ? 'Sending…' : 'Request Join'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })
            )}

            <Pressable
              style={[
                styles.optionRow,
                { borderTopColor: colors.surfaceBorder, opacity: demoJoined ? 0.5 : 1 },
              ]}
              onPress={handleJoinDemo}
              disabled={joiningDemo || demoJoined}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="school-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Try the Demo Class</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                  {demoJoined
                    ? 'You already joined the demo class'
                    : 'Explore Ghost with sample Q&A data'}
                </Text>
              </View>
              {!demoJoined && (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>

            <Text
              style={[
                styles.joinedClassesTitle,
                { color: colors.text, borderTopColor: colors.surfaceBorder },
              ]}
            >
              Joined Classes
            </Text>
            {loadingClasses ? (
              <Text style={[styles.emptyClassesText, { color: colors.textMuted }]}>
                Loading your classes…
              </Text>
            ) : joinedClasses.length === 0 ? (
              <Text style={[styles.emptyClassesText, { color: colors.textMuted }]}>
                No classes joined yet.
              </Text>
            ) : (
              joinedClasses.map((whiteboard) => (
                <View
                  key={whiteboard.id}
                  style={[
                    styles.classRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.classMeta}>
                    <Text style={[styles.classCode, { color: colors.primary }]}>
                      {whiteboard.courseCode}
                    </Text>
                    <Text style={[styles.className, { color: colors.text }]} numberOfLines={1}>
                      {whiteboard.courseName}
                    </Text>
                  </View>
                  <Text style={[styles.classSemester, { color: colors.textSecondary }]}>
                    {whiteboard.semester}
                  </Text>
                </View>
              ))
            )}
          </GlassCard>

          <GlassButton
            title={hasJoinedAtLeastOne ? 'Continue to Home' : 'Join a Class to Continue'}
            onPress={handleContinue}
            disabled={!hasJoinedAtLeastOne}
            solid={hasJoinedAtLeastOne}
          />
        </ScrollView>

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
            Point your camera at the QR code shared by your instructor.
          </Text>
        </GlassModal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    overflow: 'hidden',
  },
  ambient: {
    position: 'absolute',
    top: -180,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.huge,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Fonts.sizes.lg,
    marginTop: 8,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: Fonts.sizes.md,
    marginBottom: 16,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: Fonts.sizes.sm,
    marginTop: 2,
  },
  loadingClassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  loadingClassesText: {
    marginLeft: 8,
    fontSize: Fonts.sizes.sm,
  },
  emptyClassesText: {
    marginTop: 8,
    fontSize: Fonts.sizes.sm,
  },
  classRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classMeta: {
    flex: 1,
    marginRight: 10,
  },
  classCode: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  className: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
  classSemester: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  classAction: {
    alignItems: 'flex-end',
  },
  classActionButton: {
    marginTop: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  classActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  joinedClassesTitle: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
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
