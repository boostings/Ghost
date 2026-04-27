import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassButton from '../components/ui/GlassButton';
import GlassModal from '../components/ui/GlassModal';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, useThemeColors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const performLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      setLogoutDialogVisible(true);
      return;
    }
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      setDeleteDialogVisible(true);
      return;
    }
    Alert.alert(
      'Delete account',
      'This action is permanent. All your questions, comments, and data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void confirmDeleteAccount() },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setDeleteDialogVisible(false);
    setDeletingAccount(true);
    try {
      await authService.deleteAccount();
      logout();
      router.replace('/(auth)/login');
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to delete account. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1a0710', Colors.background, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
      />

      <GlassModal
        visible={logoutDialogVisible}
        onClose={() => setLogoutDialogVisible(false)}
        title="Log out"
        footer={
          <View style={styles.dialogFooter}>
            <View style={styles.dialogFooterButton}>
              <GlassButton
                title="Cancel"
                variant="secondary"
                onPress={() => setLogoutDialogVisible(false)}
              />
            </View>
            <View style={styles.dialogFooterButton}>
              <GlassButton
                title="Log out"
                variant="danger"
                solid
                onPress={() => {
                  setLogoutDialogVisible(false);
                  performLogout();
                }}
              />
            </View>
          </View>
        }
      >
        <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
          Are you sure you want to log out?
        </Text>
      </GlassModal>

      <GlassModal
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
        title="Delete account"
        footer={
          <View style={styles.dialogFooter}>
            <View style={styles.dialogFooterButton}>
              <GlassButton
                title="Cancel"
                variant="secondary"
                onPress={() => setDeleteDialogVisible(false)}
              />
            </View>
            <View style={styles.dialogFooterButton}>
              <GlassButton
                title="Delete"
                variant="danger"
                solid
                loading={deletingAccount}
                disabled={deletingAccount}
                onPress={() => void confirmDeleteAccount()}
              />
            </View>
          </View>
        }
      >
        <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
          This action is permanent. All your questions, comments, and data will be removed.
        </Text>
      </GlassModal>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(360).delay(60)}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Push notifications</Text>
                  <Text style={styles.rowHint}>Alerts for new answers and comments</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(187,39,68,0.5)' }}
                  thumbColor={notificationsEnabled ? Colors.primary : Colors.textMuted}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="mail-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Email notifications</Text>
                  <Text style={styles.rowHint}>Daily summary of important updates</Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(187,39,68,0.5)' }}
                  thumbColor={emailNotifications ? Colors.primary : Colors.textMuted}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(360).delay(120)}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="person-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{user?.email ?? 'Signed in'}</Text>
                  <Text style={styles.rowHint}>Currently signed in account</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(360).delay(180)}
            style={styles.actionsBlock}
          >
            <GlassButton title="Log out" onPress={handleLogout} variant="secondary" />
            <View style={{ height: 10 }} />
            <GlassButton
              title="Delete account"
              onPress={handleDeleteAccount}
              variant="danger"
              loading={deletingAccount}
              disabled={deletingAccount}
            />
          </Animated.View>

          <Text style={styles.versionText}>Ghost v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  iconButtonPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  headerCopy: { marginLeft: 14, flex: 1 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.6,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textMuted,
    letterSpacing: 1.6,
    marginBottom: 10,
    marginTop: 16,
  },

  card: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(187,39,68,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  rowHint: { color: Colors.textMuted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  actionsBlock: { marginTop: 22 },

  versionText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  dialogFooter: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dialogFooterButton: { flex: 1 },
  dialogMessage: { fontSize: Fonts.sizes.md, lineHeight: 22 },
});
