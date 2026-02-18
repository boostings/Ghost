import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { whiteboardService } from '../../services/whiteboardService';

export default function OnboardingScreen() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joiningDemo, setJoiningDemo] = useState(false);

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code.');
      return;
    }

    setJoining(true);
    try {
      await whiteboardService.joinByInviteCode(inviteCode.trim());
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Invalid invite code. Please try again.';
      Alert.alert('Join Failed', message);
    } finally {
      setJoining(false);
    }
  };

  const handleJoinDemo = async () => {
    setJoiningDemo(true);
    try {
      await whiteboardService.joinByInviteCode('DEMO');
      router.replace('/(tabs)/home');
    } catch {
      // If demo join fails, still proceed to home
      router.replace('/(tabs)/home');
    } finally {
      setJoiningDemo(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

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
              Let's get you into your first class
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
              loading={joining}
              disabled={joining || !inviteCode.trim()}
            />
          </GlassCard>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Scan QR Code */}
          <GlassCard style={styles.card}>
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => {
                Alert.alert(
                  'Scan QR Code',
                  'QR code scanning will open your camera to scan the invite code from your instructor.'
                );
              }}
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

          {/* Demo Class */}
          <GlassCard style={styles.card}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleJoinDemo}
              disabled={joiningDemo}
            >
              <Text style={styles.demoIcon}>{"🏫"}</Text>
              <View style={styles.demoTextContainer}>
                <Text style={styles.demoTitle}>Try the Demo Class</Text>
                <Text style={styles.demoSubtitle}>
                  Explore Ghost with sample Q&A data
                </Text>
              </View>
              <Text style={styles.chevron}>{"›"}</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Skip */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
    paddingVertical: 4,
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
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.md,
  },
});
