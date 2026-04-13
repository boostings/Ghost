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
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';

const CODE_LENGTH = 6;

export default function VerifyResetCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
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
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{'✉️'}</Text>
              </View>
              <Text style={styles.title}>Enter Reset Code</Text>
              <Text style={styles.subtitle}>Use the 6-digit code generated for</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            <GlassCard style={styles.card}>
              <Text style={styles.cardLabel}>Enter reset code</Text>

              <View style={styles.codeContainer}>
                {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[styles.codeInput, code[index] ? styles.codeInputFilled : null]}
                    value={code[index]}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? CODE_LENGTH : 1}
                    selectTextOnFocus
                    selectionColor={Colors.primary}
                    placeholderTextColor={Colors.textMuted}
                  />
                ))}
              </View>

              <GlassButton
                title="Verify Code"
                onPress={handleVerifyCode}
                loading={loading}
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Need a new code? </Text>
              <TouchableOpacity onPress={handleResendCode} disabled={resending}>
                <Text style={[styles.resendLink, resending && styles.resendDisabled]}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(187,39,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.4)',
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: Fonts.sizes.md,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
  },
  resendLink: {
    color: Colors.primary,
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
    color: Colors.textMuted,
    fontSize: Fonts.sizes.md,
  },
});
