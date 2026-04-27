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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Stagger } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../hooks/useApi';
import {
  getEmailError,
  getNameError,
  getPasswordError,
  getConfirmPasswordError,
} from '../../utils/validators';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    const firstNameErr = getNameError(firstName, 'First name');
    if (firstNameErr) newErrors.firstName = firstNameErr;

    const lastNameErr = getNameError(lastName, 'Last name');
    if (lastNameErr) newErrors.lastName = lastNameErr;

    const emailErr = getEmailError(email);
    if (emailErr) newErrors.email = emailErr;

    const passwordErr = getPasswordError(password);
    if (passwordErr) newErrors.password = passwordErr;

    const confirmErr = getConfirmPasswordError(password, confirmPassword);
    if (confirmErr) newErrors.confirmPassword = confirmErr;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setAuthError(null);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setAuthError(null);
    setLoading(true);
    try {
      await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: email.trim().toLowerCase() },
      });
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      const normalizedMessage = errorMessage.toLowerCase();

      if (normalizedMessage.includes('email is already registered')) {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else {
        setAuthError(errorMessage);
      }

      if (Platform.OS !== 'web') {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    if (field === 'email' && authError) {
      setAuthError(null);
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
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Join your classmates on Ghost
              </Text>
            </Animated.View>

            <GlassCard
              style={styles.card}
              entering={FadeInDown.duration(Duration.hero).delay(Stagger.card).springify().damping(20)}
            >
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <GlassInput
                    label="First Name"
                    placeholder="John"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      clearError('firstName');
                    }}
                    autoCapitalize="words"
                    error={errors.firstName}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.nameSpacer} />
                <View style={styles.nameField}>
                  <GlassInput
                    label="Last Name"
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      clearError('lastName');
                    }}
                    autoCapitalize="words"
                    error={errors.lastName}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <GlassInput
                label="Email"
                placeholder="you@ilstu.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                returnKeyType="next"
              />

              <GlassInput
                label="Password"
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError('password');
                }}
                secureTextEntry
                error={errors.password}
                returnKeyType="next"
              />

              <GlassInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearError('confirmPassword');
                }}
                secureTextEntry
                error={errors.confirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              {authError ? (
                <Text style={[styles.authErrorText, { color: colors.error }]}>{authError}</Text>
              ) : null}

              <GlassButton
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
                disabled={loading || !canSubmit}
                solid
              />
            </GlassCard>

            <Animated.View
              style={styles.footer}
              entering={FadeIn.duration(Duration.slow).delay(Stagger.footer)}
            >
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login')}
                accessibilityRole="button"
                accessibilityLabel="Go back to sign in"
              >
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
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
  title: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Fonts.sizes.lg,
    marginTop: 8,
  },
  card: {
    marginBottom: Spacing.xxl,
  },
  authErrorText: {
    fontSize: Fonts.sizes.sm,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameField: {
    flex: 1,
  },
  nameSpacer: {
    width: 12,
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
});
