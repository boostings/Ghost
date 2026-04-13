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
import { useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';

export default function ForgotPasswordScreen() {
  const router = useRouter();
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
      await authService.forgotPassword(normalizedEmail);
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

      Alert.alert('Unable to Start Reset', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
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
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{'🔐'}</Text>
              </View>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your account email and we will generate a 6-digit reset code.
              </Text>
            </View>

            <GlassCard style={styles.card}>
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

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Back to Login</Text>
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
  card: {
    marginBottom: 24,
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
