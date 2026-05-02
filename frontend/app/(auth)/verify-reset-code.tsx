import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease, Stagger } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';

const CODE_LENGTH = 6;

export default function VerifyResetCodeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const canSubmit = code.join('').length === CODE_LENGTH;

  const handleCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(Array.from({ length: CODE_LENGTH }, (_, index) => digits[index] ?? ''));

    if (digits.length === CODE_LENGTH) {
      inputRef.current?.blur();
      return;
    }

    setFocusedIndex(digits.length);
  };

  const focusCodeInput = () => {
    inputRef.current?.focus();
    setFocusedIndex(Math.min(code.join('').length, CODE_LENGTH - 1));
  };

  const handleVerifyCode = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please return to login and start the reset again.');
      return;
    }

    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      Alert.alert('Invalid Code', 'Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await authService.verifyPasswordResetCode({
        email,
        code: fullCode,
      });
      router.push({
        pathname: '/(auth)/new-password',
        params: { email, code: fullCode },
      });
    } catch (error: unknown) {
      Alert.alert('Verification Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please return to login and start the reset again.');
      return;
    }

    setResending(true);
    try {
      await authService.forgotPassword(email);
      setCode(Array(CODE_LENGTH).fill(''));
      Alert.alert(
        'Reset Code Sent',
        __DEV__
          ? 'Use the new 6-digit code printed in the backend logs.'
          : 'We sent a new 6-digit code to your email.'
      );
    } catch (error: unknown) {
      Alert.alert('Unable to Resend', extractErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <LinearGradient colors={colors.bgGradient} style={styles.gradient}>
      <View
        style={[styles.ambient, { backgroundColor: `${colors.primary}1A` }]}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Reset Code"
          onBack={() => router.replace('/(auth)/forgot-password')}
          border={false}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
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
                <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Enter Reset Code</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Use the 6-digit code generated for
              </Text>
              <Text style={[styles.emailText, { color: colors.primary }]}>{email}</Text>
            </Animated.View>

            <GlassCard
              style={styles.card}
              entering={FadeInDown.duration(Duration.normal).delay(Stagger.card).easing(Ease.out)}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Enter reset code
              </Text>

              <View style={styles.codeContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.hiddenCodeInput}
                  value={code.join('')}
                  onChangeText={handleCodeChange}
                  onFocus={() => setFocusedIndex(Math.min(code.join('').length, CODE_LENGTH - 1))}
                  onBlur={() => setFocusedIndex(-1)}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  selectionColor={colors.primary}
                  caretHidden
                  accessibilityLabel="Reset code"
                />
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const filled = !!code[index];
                  const focused = focusedIndex === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.codeInput,
                        {
                          backgroundColor: filled ? colors.surfaceLight : colors.inputBg,
                          borderColor: focused
                            ? colors.primary
                            : filled
                              ? colors.surfaceBorder
                              : colors.inputBorder,
                        },
                      ]}
                      onPress={focusCodeInput}
                      accessibilityRole="button"
                      accessibilityLabel={`Reset code digit ${index + 1}`}
                    >
                      <Text style={[styles.codeDigit, { color: colors.text }]}>{code[index]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <GlassButton
                title="Verify Code"
                onPress={handleVerifyCode}
                loading={loading}
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <Animated.View entering={FadeIn.duration(Duration.slow).delay(Stagger.footer)}>
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                  Need a new code?{' '}
                </Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resending}
                  accessibilityRole="button"
                  accessibilityLabel="Resend reset code"
                  accessibilityState={{ disabled: resending, busy: resending }}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      { color: colors.primary },
                      resending && styles.resendDisabled,
                    ]}
                  >
                    {resending ? 'Sending…' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
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
  },
  emailText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    marginBottom: Spacing.xxl,
  },
  cardLabel: {
    fontSize: Fonts.sizes.md,
    marginBottom: 16,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
    position: 'relative',
  },
  hiddenCodeInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    color: 'transparent',
    backgroundColor: 'transparent',
    opacity: 0.01,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: Fonts.sizes.md,
  },
  resendLink: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
  resendDisabled: {
    opacity: 0.5,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    fontSize: Fonts.sizes.md,
  },
});
