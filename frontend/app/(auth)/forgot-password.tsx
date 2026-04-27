import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Stagger } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';

const UNVERIFIED_EMAIL_MESSAGE = 'email is not verified';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const canSubmit = email.trim().length > 0;

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    setError(undefined);
    return true;
  };

  const handleSendCode = async () => {
    if (!validate()) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const response = await authService.forgotPassword(normalizedEmail);
      if (response.nextStep === 'VERIFY_EMAIL') {
        Alert.alert(
          'Verify Email',
          'We sent a new verification code to your email. Enter it before resetting your password.'
        );
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: normalizedEmail, source: 'forgot-password' },
        });
        return;
      }

      Alert.alert('Reset Code Ready', 'Use the 6-digit reset code from the backend logs.');
      router.push({
        pathname: '/(auth)/verify-reset-code',
        params: { email: normalizedEmail },
      });
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        Alert.alert(
          'Email Not Found',
          'No account exists with that email. Please create an account using this email first.'
        );
        return;
      }

      const message = extractErrorMessage(error);
      if (message.toLowerCase().includes(UNVERIFIED_EMAIL_MESSAGE)) {
        await authService.resendVerificationCode(normalizedEmail);
        Alert.alert(
          'Verify Email',
          'We sent a new verification code to your email. Enter it before resetting your password.'
        );
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: normalizedEmail, source: 'forgot-password' },
        });
        return;
      }

      Alert.alert('Unable to Start Reset', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.bgGradient} style={styles.gradient}>
      <View
        style={[styles.ambient, { backgroundColor: `${colors.primary}1A` }]}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your account email and we will generate a 6-digit reset code.
              </Text>
            </Animated.View>

            <GlassCard
              style={styles.card}
              entering={FadeInDown.duration(Duration.hero).delay(Stagger.card).springify().damping(20)}
            >
              <GlassInput
                label="Email"
                placeholder="you@ilstu.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) {
                    setError(undefined);
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={error}
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />

              <GlassButton
                title="Send Reset Code"
                onPress={handleSendCode}
                loading={loading}
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <Animated.View entering={FadeIn.duration(Duration.slow).delay(Stagger.footer)}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={[styles.backText, { color: colors.textMuted }]}>Back to Login</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    marginBottom: Spacing.xxl,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    fontSize: Fonts.sizes.md,
  },
});
