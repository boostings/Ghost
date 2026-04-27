import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
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
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Stagger } from '../../constants/motion';
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
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const canSubmit = code.join('').length === CODE_LENGTH;

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];

    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
      for (let i = 0; i < CODE_LENGTH; i++) {
        newCode[i] = digits[i] || '';
      }
      setCode(newCode);
      const nextEmptyIndex = newCode.findIndex((digit) => digit === '');
      if (nextEmptyIndex === -1) {
        inputRefs.current[CODE_LENGTH - 1]?.blur();
      } else {
        inputRefs.current[nextEmptyIndex]?.focus();
      }
      return;
    }

    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);

    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
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
      Alert.alert('Reset Code Ready', 'Use the new 6-digit code from the backend logs.');
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
              entering={FadeInDown.duration(Duration.hero)
                .delay(Stagger.card)
                .springify()
                .damping(20)}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Enter reset code
              </Text>

              <View style={styles.codeContainer}>
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const filled = !!code[index];
                  const focused = focusedIndex === index;
                  return (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.codeInput,
                        {
                          backgroundColor: filled ? colors.surfaceLight : colors.inputBg,
                          borderColor: focused
                            ? colors.primary
                            : filled
                              ? colors.surfaceBorder
                              : colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(-1)}
                      value={code[index]}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? CODE_LENGTH : 1}
                      selectTextOnFocus
                      selectionColor={colors.primary}
                      placeholderTextColor={colors.textMuted}
                    />
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
                <TouchableOpacity onPress={handleResendCode} disabled={resending}>
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

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(auth)/forgot-password')}
              >
                <Text style={[styles.backText, { color: colors.textMuted }]}>Back</Text>
              </TouchableOpacity>
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
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
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
