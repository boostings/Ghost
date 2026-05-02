import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GhostMark } from '../../components/brand/GhostBrand';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease, Stagger } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { haptic } from '../../utils/haptics';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';
import { getEmailFieldState, normalizePassword } from '../../utils/validators';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [emailBlurred, setEmailBlurred] = useState(false);

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  const emailField = getEmailFieldState({
    value: email,
    active: emailBlurred,
    manualError: errors.email,
    invalidMessage: 'Use your @ilstu.edu address',
  });
  const normalizedPassword = normalizePassword(password);
  const canSubmit = emailField.valid && normalizedPassword.length > 0;

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!emailField.valid) {
      newErrors.email = 'Use your @ilstu.edu address';
    }
    if (!normalizedPassword) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setAuthError(null);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      haptic.error();
      return;
    }

    setAuthError(null);
    setLoading(true);
    try {
      const normalizedEmail = emailField.normalized;
      const response = await authService.login({
        email: normalizedEmail,
        password: normalizedPassword,
      });
      haptic.success();
      setAuth(response.user, response.accessToken, response.refreshToken);
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);

      if (errorMessage.toLowerCase().includes('email is not verified')) {
        haptic.warning();
        const normalizedEmail = emailField.normalized;
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: normalizedEmail, source: 'login' },
        });
        Alert.alert(
          'Verify Email',
          'We sent a new verification code to your email. Enter it to finish signing in.'
        );
        return;
      }

      haptic.error();
      setAuthError(errorMessage);
      if (Platform.OS !== 'web') {
        Alert.alert('Login Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.bgGradient} locations={[0, 0.55, 1]} style={styles.gradient}>
      <View style={styles.heroGlow} pointerEvents="none">
        <View style={[styles.glow, styles.glowOuter, { backgroundColor: `${colors.primary}10` }]} />
        <View
          style={[styles.glow, styles.glowMiddle, { backgroundColor: `${colors.primary}1A` }]}
        />
        <View style={[styles.glow, styles.glowInner, { backgroundColor: `${colors.primary}26` }]} />
        <View style={[styles.glow, styles.glowCore, { backgroundColor: `${colors.primary}38` }]} />
      </View>
      <View
        style={[styles.ambientCorner, { backgroundColor: `${colors.primaryDark}24` }]}
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
              <GhostMark size={148} animated />
              <Text style={[styles.title, { color: colors.text }]}>Ghost</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Office hours, 24/7.
              </Text>
            </Animated.View>

            <GlassCard
              style={styles.card}
              blurIntensity={75}
              entering={FadeInDown.duration(Duration.normal).delay(Stagger.card).easing(Ease.out)}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                Sign in to continue
              </Text>

              <GlassInput
                label="Email"
                placeholder="you@ilstu.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (authError) setAuthError(null);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailField.visibleError}
                returnKeyType="next"
                onBlur={() => setEmailBlurred(true)}
              />

              <GlassInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (authError) setAuthError(null);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry
                error={errors.password}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              {authError ? (
                <Text style={[styles.authErrorText, { color: colors.error }]}>{authError}</Text>
              ) : null}

              <GlassButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <Animated.View entering={FadeIn.duration(Duration.slow).delay(Stagger.footer)}>
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Don&apos;t have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  accessibilityRole="button"
                  accessibilityLabel="Register for a new account"
                >
                  <Text style={[styles.footerLink, { color: colors.primary }]}>Register</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => router.push('/(auth)/forgot-password')}
                accessibilityRole="button"
                accessibilityLabel="Forgot your password"
              >
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                  Forgot Password?
                </Text>
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
  heroGlow: {
    position: 'absolute',
    top: -140,
    left: 0,
    right: 0,
    height: 640,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  glowOuter: {
    width: 660,
    height: 660,
    borderRadius: 330,
  },
  glowMiddle: {
    width: 500,
    height: 500,
    borderRadius: 250,
  },
  glowInner: {
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  glowCore: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  ambientCorner: {
    position: 'absolute',
    bottom: -220,
    left: -140,
    width: 460,
    height: 460,
    borderRadius: 230,
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
    marginBottom: Spacing.xxxl + 4,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: Fonts.sizes.lg,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  card: {
    marginBottom: Spacing.xxl,
  },
  cardTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: Fonts.sizes.md,
    textAlign: 'center',
    marginBottom: 22,
  },
  authErrorText: {
    fontSize: Fonts.sizes.sm,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: Fonts.sizes.md,
  },
  footerLink: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
});
