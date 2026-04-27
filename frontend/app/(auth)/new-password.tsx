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
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Stagger } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { extractErrorMessage } from '../../hooks/useApi';

export default function NewPasswordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const code = typeof params.code === 'string' ? params.code : '';
  const setAuth = useAuthStore((state) => state.setAuth);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const canSubmit = newPassword.length > 0 && confirmPassword.length > 0;

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
                <Ionicons name="key-outline" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Create New Password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Set a new password for
              </Text>
              <Text style={[styles.emailText, { color: colors.primary }]}>{email}</Text>
            </Animated.View>

            <GlassCard
              style={styles.card}
              entering={FadeInDown.duration(Duration.hero).delay(Stagger.card).springify().damping(20)}
            >
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
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <Animated.View entering={FadeIn.duration(Duration.slow).delay(Stagger.footer)}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (email) {
                    router.replace({
                      pathname: '/(auth)/verify-reset-code',
                      params: { email },
                    });
                  } else {
                    router.replace('/(auth)/forgot-password');
                  }
                }}
              >
                <Text style={[styles.backText, { color: colors.textMuted }]}>Back</Text>
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
  },
  emailText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    marginTop: 4,
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
