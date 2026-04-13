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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaskedView from '@react-native-masked-view/masked-view';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await authService.login({ email: normalizedEmail, password });
      setAuth(response.user, response.accessToken, response.refreshToken);
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);

      if (errorMessage.toLowerCase().includes('email is not verified')) {
        const normalizedEmail = email.trim().toLowerCase();
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

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0B0D12', Colors.background, '#05070A']}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <View style={styles.heroGlow} pointerEvents="none">
        <View style={[styles.glow, styles.glowOuter]} />
        <View style={[styles.glow, styles.glowMiddle]} />
        <View style={[styles.glow, styles.glowInner]} />
        <View style={[styles.glow, styles.glowCore]} />
      </View>
      <View style={styles.ambientCorner} pointerEvents="none" />

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
            <View style={styles.header}>
              <MaskedView
                style={styles.logoMask}
                maskElement={
                  <Image
                    source={require('../../public/logo.png')}
                    style={styles.logoMaskImage}
                    resizeMode="contain"
                  />
                }
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F3F4F6', '#D1D5DB']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.logoFill}
                />
              </MaskedView>
              <Text style={styles.title}>Ghost</Text>
              <Text style={styles.subtitle}>Office hours, 24/7.</Text>
            </View>

            <GlassCard style={styles.card} blurIntensity={75}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>Sign in to continue</Text>

              <GlassInput
                label="Email"
                placeholder="you@ilstu.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                returnKeyType="next"
              />

              <GlassInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry
                error={errors.password}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <GlassButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                accessibilityRole="button"
                accessibilityLabel="Register for a new account"
              >
                <Text style={styles.footerLink}>Register</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push('/(auth)/forgot-password')}
              accessibilityRole="button"
              accessibilityLabel="Forgot your password"
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(187, 39, 68, 0.05)',
  },
  glowMiddle: {
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(187, 39, 68, 0.09)',
  },
  glowInner: {
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(187, 39, 68, 0.14)',
  },
  glowCore: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(187, 39, 68, 0.22)',
  },
  ambientCorner: {
    position: 'absolute',
    bottom: -220,
    left: -140,
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(142, 29, 52, 0.14)',
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoMask: {
    width: 148,
    height: 148,
    marginBottom: 4,
  },
  logoMaskImage: {
    width: 148,
    height: 148,
  },
  logoFill: {
    flex: 1,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: Fonts.sizes.lg,
    color: Colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  card: {
    marginBottom: 24,
    borderRadius: 22,
  },
  cardTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
});
