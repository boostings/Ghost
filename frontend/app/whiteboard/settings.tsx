import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import GlassInput from '../../components/ui/GlassInput';
import GlassModal from '../../components/ui/GlassModal';
import QRCodeModal from '../../components/QRCodeModal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { whiteboardService } from '../../services/whiteboardService';
import { extractErrorMessage } from '../../hooks/useApi';
import type { WhiteboardResponse } from '../../types';

export default function WhiteboardSettingsScreen() {
  const router = useRouter();
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();
  const user = useAuthStore((state) => state.user);

  const [whiteboard, setWhiteboard] = useState<WhiteboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = whiteboard?.ownerId === user?.id;

  const fetchWhiteboard = useCallback(async () => {
    if (!whiteboardId) return;
    try {
      const wb = await whiteboardService.getById(whiteboardId);
      setWhiteboard(wb);
    } catch {
      Alert.alert('Error', 'Failed to load whiteboard settings.');
    } finally {
      setLoading(false);
    }
  }, [whiteboardId]);

  useEffect(() => {
    fetchWhiteboard();
  }, [fetchWhiteboard]);

  const handleCopyInviteCode = () => {
    if (whiteboard?.inviteCode) {
      Clipboard.setStringAsync(whiteboard.inviteCode).then(() => {
        Alert.alert('Copied', 'Invite code copied to clipboard.');
      }).catch(() => {
        Alert.alert('Invite Code', `The invite code is: ${whiteboard.inviteCode}`, [
          { text: 'OK' },
        ]);
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferEmail.trim() || !whiteboardId) return;

    setTransferring(true);
    try {
      await whiteboardService.transferOwnership(whiteboardId, transferEmail.trim());
      Alert.alert('Success', 'Ownership has been transferred. You have been removed from this whiteboard.');
      setShowTransferModal(false);
      router.back();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setTransferring(false);
    }
  };

  const handleDeleteWhiteboard = () => {
    Alert.alert(
      'Delete Whiteboard',
      'This will permanently delete this whiteboard and all its questions, comments, and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!whiteboardId) return;
            setDeleting(true);
            try {
              await whiteboardService.delete(whiteboardId);
              Alert.alert('Deleted', 'The whiteboard has been deleted.');
              router.replace('/(tabs)/home');
            } catch {
              Alert.alert('Error', 'Failed to delete whiteboard.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenQrModal = () => {
    if (!whiteboard?.inviteCode) {
      Alert.alert('Unavailable', 'Invite code is not available yet. Please try again.');
      return;
    }
    setShowQrModal(true);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>{"\u2190"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Whiteboard Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Class Info */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Class Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Course Code</Text>
              <Text style={styles.infoValue}>{whiteboard?.courseCode || '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Course Name</Text>
              <Text style={styles.infoValue}>{whiteboard?.courseName || '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Semester</Text>
              <Text style={styles.infoValue}>{whiteboard?.semester || '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Members</Text>
              <Text style={styles.infoValue}>{whiteboard?.memberCount || 0}</Text>
            </View>
          </GlassCard>

          {/* Invite Code */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Invite Code</Text>
            <Text style={styles.sectionDescription}>
              Share this code or QR with students to join the class
            </Text>

            <TouchableOpacity
              style={styles.inviteCodeBox}
              onPress={handleCopyInviteCode}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copy invite code"
            >
              <Text style={styles.inviteCodeText}>
                {whiteboard?.inviteCode || '------'}
              </Text>
              <Text style={styles.copyText}>Tap to copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.qrPlaceholder}
              onPress={handleOpenQrModal}
              activeOpacity={0.8}
            >
              <Text style={styles.qrIcon}>{"\u{1F4F1}"}</Text>
              <Text style={styles.qrText}>QR Code</Text>
              <Text style={styles.qrSubtext}>Students can scan this to join</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Manage Links */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Manage</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push({
                  pathname: '/whiteboard/topics',
                  params: { whiteboardId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Manage topics"
            >
              <Text style={styles.menuIcon}>{"\u{1F3F7}\uFE0F"}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Manage Topics</Text>
                <Text style={styles.menuDescription}>
                  Add or remove question topics
                </Text>
              </View>
              <Text style={styles.menuChevron}>{"\u203A"}</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push({
                  pathname: '/whiteboard/members',
                  params: { whiteboardId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Manage members"
            >
              <Text style={styles.menuIcon}>{"\u{1F465}"}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Manage Members</Text>
                <Text style={styles.menuDescription}>
                  View members and join requests
                </Text>
              </View>
              <Text style={styles.menuChevron}>{"\u203A"}</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push({
                  pathname: '/whiteboard/audit-log',
                  params: { whiteboardId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Open audit log"
            >
              <Text style={styles.menuIcon}>{"\u{1F4CB}"}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Audit Log</Text>
                <Text style={styles.menuDescription}>
                  View activity history
                </Text>
              </View>
              <Text style={styles.menuChevron}>{"\u203A"}</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push({
                  pathname: '/moderation/reports',
                  params: { whiteboardId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Open moderation reports"
            >
              <Text style={styles.menuIcon}>{"\u{1F6A9}"}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Moderation</Text>
                <Text style={styles.menuDescription}>
                  Review reported content
                </Text>
              </View>
              <Text style={styles.menuChevron}>{"\u203A"}</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Danger Zone */}
          {isOwner && (
            <GlassCard style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>

              <View style={styles.dangerActions}>
                <GlassButton
                  title="Transfer Ownership"
                  onPress={() => setShowTransferModal(true)}
                  variant="secondary"
                />

                <View style={styles.dangerSpacer} />

                <GlassButton
                  title="Delete Whiteboard"
                  onPress={handleDeleteWhiteboard}
                  variant="danger"
                  loading={deleting}
                  disabled={deleting}
                />
              </View>
            </GlassCard>
          )}
        </ScrollView>

        {/* Transfer Modal */}
        <GlassModal
          visible={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          title="Transfer Ownership"
        >
          <Text style={styles.modalDescription}>
            Enter the email of the faculty member you want to transfer ownership to.
            You will be removed from this whiteboard.
          </Text>

          <GlassInput
            label="Faculty Email"
            placeholder="faculty@ilstu.edu"
            value={transferEmail}
            onChangeText={setTransferEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <GlassButton
            title="Transfer Ownership"
            onPress={handleTransferOwnership}
            variant="danger"
            loading={transferring}
            disabled={transferring || !transferEmail.trim()}
          />
        </GlassModal>

        <QRCodeModal
          visible={showQrModal}
          onClose={() => setShowQrModal(false)}
          inviteCode={whiteboard?.inviteCode ?? ''}
          whiteboardName={whiteboard ? `${whiteboard.courseCode} - ${whiteboard.courseName}` : 'Whiteboard'}
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: Colors.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  inviteCodeBox: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteCodeText: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 4,
  },
  copyText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  qrPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  qrIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  qrText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  qrSubtext: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  menuDescription: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dangerCard: {
    marginBottom: 16,
    borderColor: 'rgba(255,68,68,0.2)',
  },
  dangerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 16,
  },
  dangerActions: {
    gap: 12,
  },
  dangerSpacer: {
    height: 4,
  },
  modalDescription: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
});
