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
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { extractErrorMessage } from '../../hooks/useApi';

export default function NewPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const code = typeof params.code === 'string' ? params.code : '';
  const setAuth = useAuthStore((state) => state.setAuth);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !code) {
      Alert.alert('Missing Reset Data', 'Please restart the password reset flow.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      Alert.alert('Invalid Password', 'Password must contain at least one letter and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword({
        email,
        code,
        newPassword,
        confirmPassword,
      });
      setAuth(response.user, response.accessToken, response.refreshToken);
      router.replace('/(tabs)/home');
    } catch (error: unknown) {
      Alert.alert('Unable to Reset Password', extractErrorMessage(error));
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
                <Text style={styles.icon}>{'🔑'}</Text>
              </View>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>Set a new password for</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            <GlassCard style={styles.card}>
              <GlassInput
                label="New Password"
                placeholder="Enter a new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                returnKeyType="next"
              />

              <GlassInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />

              <GlassButton
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
              />
            </GlassCard>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Back</Text>
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
  emailText: {
    fontSize: Fonts.sizes.md,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
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
