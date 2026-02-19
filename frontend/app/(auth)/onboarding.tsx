import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import GlassModal from '../../components/ui/GlassModal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { whiteboardService } from '../../services/whiteboardService';
import { extractErrorMessage } from '../../hooks/useApi';
import { parseInviteCode } from '../../utils/inviteCode';
import type { WhiteboardResponse } from '../../types';

const DEMO_INVITE_CODE = 'DEMO2026';

export default function OnboardingScreen() {
  const router = useRouter();

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

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeEmoji}>{"🎉"}</Text>
            <Text style={styles.title}>Welcome to Ghost!</Text>
            <Text style={styles.subtitle}>
              Join at least one class to continue
            </Text>
          </View>

          {/* Join with Code */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Join a Class</Text>
            <Text style={styles.cardDescription}>
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
            />

            <TouchableOpacity
              style={styles.qrButton}
              onPress={openScanner}
            >
              <Text style={styles.qrIcon}>{"📷"}</Text>
              <View style={styles.qrTextContainer}>
                <Text style={styles.qrTitle}>Scan QR Code</Text>
                <Text style={styles.qrSubtitle}>
                  Use your camera to scan the class QR code
                </Text>
              </View>
              <Text style={styles.chevron}>{"›"}</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Available Classes */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Available Classes</Text>
            <Text style={styles.cardDescription}>
              Request access to class whiteboards managed by faculty.
            </Text>

            {loadingClasses ? (
              <View style={styles.loadingClassesRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingClassesText}>Loading classes...</Text>
              </View>
            ) : availableClasses.length === 0 ? (
              <Text style={styles.emptyClassesText}>
                No discoverable classes right now. Use an invite code or QR to join.
              </Text>
            ) : (
              availableClasses.map((whiteboard) => {
                const requesting = requestingClassIds.includes(whiteboard.id);
                const requested = requestedClassIds.includes(whiteboard.id);

                return (
                  <View key={whiteboard.id} style={styles.classRow}>
                    <View style={styles.classMeta}>
                      <Text style={styles.classCode}>{whiteboard.courseCode}</Text>
                      <Text style={styles.className} numberOfLines={1}>
                        {whiteboard.courseName}
                      </Text>
                    </View>
                    <View style={styles.classAction}>
                      <Text style={styles.classSemester}>{whiteboard.semester}</Text>
                      <TouchableOpacity
                        style={[
                          styles.classActionButton,
                          requested && styles.classActionButtonRequested,
                        ]}
                        onPress={() => handleRequestJoin(whiteboard)}
                        disabled={requesting || requested}
                      >
                        <Text
                          style={[
                            styles.classActionButtonText,
                            requested && styles.classActionButtonTextRequested,
                          ]}
                        >
                          {requested ? 'Requested' : requesting ? 'Sending...' : 'Request Join'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleJoinDemo}
              disabled={joiningDemo || demoJoined}
            >
              <Text style={styles.demoIcon}>{"🏫"}</Text>
              <View style={styles.demoTextContainer}>
                <Text style={styles.demoTitle}>Try the Demo Class</Text>
                <Text style={styles.demoSubtitle}>
                  {demoJoined ? 'You already joined the demo class' : 'Explore Ghost with sample Q&A data'}
                </Text>
              </View>
              <Text style={styles.chevron}>{"›"}</Text>
            </TouchableOpacity>

            <Text style={styles.joinedClassesTitle}>Joined Classes</Text>
            {loadingClasses ? (
              <Text style={styles.emptyClassesText}>Loading your classes...</Text>
            ) : joinedClasses.length === 0 ? (
              <Text style={styles.emptyClassesText}>No classes joined yet.</Text>
            ) : (
              joinedClasses.map((whiteboard) => (
                <View key={whiteboard.id} style={styles.classRow}>
                  <View style={styles.classMeta}>
                    <Text style={styles.classCode}>{whiteboard.courseCode}</Text>
                    <Text style={styles.className} numberOfLines={1}>
                      {whiteboard.courseName}
                    </Text>
                  </View>
                  <Text style={styles.classSemester}>{whiteboard.semester}</Text>
                </View>
              ))
            )}
          </GlassCard>

          <GlassButton
            title={hasJoinedAtLeastOne ? 'Continue to Home' : 'Join a Class to Continue'}
            onPress={handleContinue}
            disabled={!hasJoinedAtLeastOne}
          />
        </ScrollView>

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
          <Text style={styles.scannerHint}>
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
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: Fonts.sizes.lg,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  qrIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  qrTextContainer: {
    flex: 1,
  },
  qrTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  qrSubtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  demoIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  demoTextContainer: {
    flex: 1,
  },
  demoTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  demoSubtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingClassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  loadingClassesText: {
    color: Colors.textMuted,
    marginLeft: 8,
    fontSize: Fonts.sizes.sm,
  },
  emptyClassesText: {
    color: Colors.textMuted,
    marginTop: 8,
    fontSize: Fonts.sizes.sm,
  },
  classRow: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classMeta: {
    flex: 1,
    marginRight: 10,
  },
  classCode: {
    color: Colors.primary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    marginBottom: 3,
  },
  className: {
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
  classSemester: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  classAction: {
    alignItems: 'flex-end',
  },
  classActionButton: {
    marginTop: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.45)',
    backgroundColor: 'rgba(108,99,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  classActionButtonRequested: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  classActionButtonText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  classActionButtonTextRequested: {
    color: Colors.textSecondary,
  },
  joinedClassesTitle: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
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
