import React, { useState, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { extractErrorMessage } from '../../hooks/useApi';

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || '';
  const setAuth = useAuthStore((state) => state.setAuth);

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];

    if (text.length > 1) {
      // Handle paste
      const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
      for (let i = 0; i < CODE_LENGTH; i++) {
        newCode[i] = digits[i] || '';
      }
      setCode(newCode);
      const nextEmptyIndex = newCode.findIndex((d) => d === '');
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

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please return to registration and try again.');
      return;
    }

    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      Alert.alert('Invalid Code', 'Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyEmail({
        email,
        code: fullCode,
      });
      setAuth(response.user, response.accessToken, response.refreshToken);
      Alert.alert('Email Verified', "You're signed in and ready to continue.");
    } catch (error: unknown) {
      Alert.alert('Verification Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please return to registration and try again.');
      return;
    }

    setResending(true);
    try {
      await authService.resendVerificationCode(email);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Text style={styles.mailIcon}>{'✉️'}</Text>
              </View>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>We sent a 6-digit verification code to</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Code Input Card */}
            <GlassCard style={styles.card}>
              <Text style={styles.cardLabel}>Enter verification code</Text>

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
                title="Verify Email"
                onPress={handleVerify}
                loading={loading}
                disabled={loading || code.join('').length !== CODE_LENGTH}
              />
            </GlassCard>

            {/* Resend */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text style={[styles.resendLink, resending && styles.resendDisabled]}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back Link */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Back to Registration</Text>
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
  mailIcon: {
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
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    color: Colors.text,
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.15)',
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
