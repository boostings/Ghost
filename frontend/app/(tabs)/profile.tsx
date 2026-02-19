import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import Avatar from '../../components/ui/Avatar';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your questions, comments, and data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await authService.deleteAccount();
              logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const firstName = user?.firstName || 'User';
  const lastName = user?.lastName || '';
  const email = user?.email || '';
  const role = user?.role || 'STUDENT';
  const karmaScore = user?.karmaScore || 0;

  return (
    <ScreenWrapper edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info Card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar firstName={firstName} lastName={lastName} size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {firstName} {lastName}
              </Text>
              <Text style={styles.userEmail}>{email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Karma Card */}
        <GlassCard style={styles.karmaCard}>
          <View style={styles.karmaRow}>
            <View style={styles.karmaItem}>
              <Text style={styles.karmaValue}>{karmaScore}</Text>
              <Text style={styles.karmaLabel}>Karma Score</Text>
            </View>
            <View style={styles.karmaDivider} />
            <View style={styles.karmaItem}>
              <Text style={styles.karmaValue}>{karmaScore >= 0 ? '\u25B2' : '\u25BC'}</Text>
              <Text style={styles.karmaLabel}>
                {karmaScore >= 0 ? 'Good Standing' : 'Needs Improvement'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <GlassCard style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive alerts for new answers and comments
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(187,39,68,0.5)' }}
              thumbColor={notificationsEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Get email summaries of important updates
              </Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(187,39,68,0.5)' }}
              thumbColor={emailNotifications ? Colors.primary : Colors.textMuted}
            />
          </View>
        </GlassCard>

        {/* Account Actions */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.actionsContainer}>
          <GlassButton title="Logout" onPress={handleLogout} variant="secondary" />

          <View style={styles.actionSpacer} />

          <GlassButton
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="danger"
            loading={deletingAccount}
            disabled={deletingAccount}
          />
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Ghost v1.0.0</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(187,39,68,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  karmaCard: {
    marginBottom: 24,
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  karmaItem: {
    flex: 1,
    alignItems: 'center',
  },
  karmaValue: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  karmaLabel: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  karmaDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
  },
  settingsCard: {
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionSpacer: {
    height: 4,
  },
  versionText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
});
