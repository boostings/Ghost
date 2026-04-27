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
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import GlassInput from '../../components/ui/GlassInput';
import GlassModal from '../../components/ui/GlassModal';
import QRCodeModal from '../../components/QRCodeModal';
import SettingsHeader from '../../components/whiteboard/SettingsHeader';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { whiteboardService } from '../../services/whiteboardService';
import { extractErrorMessage } from '../../hooks/useApi';
import type { WhiteboardResponse } from '../../types';

type InviteInfo = {
  inviteCode: string;
  inviteUrl: string;
  qrData: string;
};

export default function WhiteboardSettingsScreen() {
  const router = useRouter();
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();
  const user = useAuthStore((state) => state.user);

  const [whiteboard, setWhiteboard] = useState<WhiteboardResponse | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = whiteboard?.ownerId === user?.id;
  const inviteCode = inviteInfo?.inviteCode || whiteboard?.inviteCode || '';
  const qrValue =
    inviteInfo?.qrData || inviteInfo?.inviteUrl || (inviteCode ? `ghost://join/${inviteCode}` : '');

  const fetchWhiteboard = useCallback(async () => {
    if (!whiteboardId) return;
    try {
      const [wb, invite] = await Promise.all([
        whiteboardService.getById(whiteboardId),
        whiteboardService.getInviteInfo(whiteboardId).catch(() => null),
      ]);
      setWhiteboard(wb);
      setInviteInfo(invite);
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
    if (inviteCode) {
      Clipboard.setStringAsync(inviteCode)
        .then(() => {
          Alert.alert('Copied', 'Invite code copied to clipboard.');
        })
        .catch(() => {
          Alert.alert('Invite Code', `The invite code is: ${inviteCode}`, [{ text: 'OK' }]);
        });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferEmail.trim() || !whiteboardId) return;

    setTransferring(true);
    try {
      await whiteboardService.transferOwnership(whiteboardId, transferEmail.trim());
      Alert.alert(
        'Success',
        'Ownership has been transferred. You have been removed from this whiteboard.'
      );
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
    if (!inviteCode) {
      Alert.alert('Unavailable', 'Invite code is not available yet. Please try again.');
      return;
    }
    setShowQrModal(true);
  };

  if (loading) {
    return (
      <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader
          title="Whiteboard Settings"
          subtitle={whiteboard?.courseCode ? `${whiteboard.courseCode} settings` : undefined}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.heroCard}>
            <View style={styles.courseHeader}>
              <View style={styles.courseCodeBadge}>
                <Text style={styles.courseCodeText}>{whiteboard?.courseCode || '--'}</Text>
              </View>
              <View style={styles.ownerBadge}>
                <Ionicons
                  name={isOwner ? 'shield-checkmark-outline' : 'school-outline'}
                  size={14}
                  color={isOwner ? Colors.success : Colors.textMuted}
                />
                <Text style={[styles.ownerBadgeText, isOwner && styles.ownerBadgeTextActive]}>
                  {isOwner ? 'Owner' : 'Faculty'}
                </Text>
              </View>
            </View>
            <Text style={styles.courseTitle}>
              {whiteboard?.courseName || 'Untitled whiteboard'}
            </Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Semester</Text>
                <Text style={styles.metaValue}>{whiteboard?.semester || '--'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Section</Text>
                <Text style={styles.metaValue}>{whiteboard?.section || '--'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Members</Text>
                <Text style={styles.metaValue}>{whiteboard?.memberCount || 0}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Invite Code — hidden for demo classes */}
          {whiteboard?.isDemo ? null : (
            <GlassCard style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View>
                  <Text style={styles.sectionTitle}>Invite Access</Text>
                  <Text style={styles.sectionDescription}>Code and QR for student enrollment</Text>
                </View>
                <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
              </View>

              <TouchableOpacity
                style={styles.inviteCodeBox}
                onPress={handleCopyInviteCode}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Copy invite code"
              >
                <Text style={styles.inviteCodeText}>{inviteCode || 'Unavailable'}</Text>
                <Text style={styles.copyText}>
                  {inviteCode ? 'Tap to copy' : 'Unable to load code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrPlaceholder}
                onPress={handleOpenQrModal}
                activeOpacity={0.8}
              >
                {qrValue ? (
                  <View style={styles.inlineQrBackground}>
                    <QRCode value={qrValue} size={132} backgroundColor="#FFFFFF" color="#111827" />
                  </View>
                ) : (
                  <View style={styles.inlineQrUnavailable}>
                    <Text style={styles.inlineQrUnavailableText}>QR unavailable</Text>
                  </View>
                )}
                <Text style={styles.qrText}>Open Full QR Code</Text>
                <Text style={styles.qrSubtext}>Students can scan this to join</Text>
              </TouchableOpacity>
            </GlassCard>
          )}

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
              <View style={styles.menuIconBubble}>
                <Ionicons name="pricetags-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Manage Topics</Text>
                <Text style={styles.menuDescription}>Add or remove question topics</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
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
              <View style={styles.menuIconBubble}>
                <Ionicons name="people-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Manage Members</Text>
                <Text style={styles.menuDescription}>View members and join requests</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
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
              <View style={styles.menuIconBubble}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Audit Log</Text>
                <Text style={styles.menuDescription}>View activity history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
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
              <View style={styles.menuIconBubble}>
                <Ionicons name="flag-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Moderation</Text>
                <Text style={styles.menuDescription}>Review reported content</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </GlassCard>

          {/* Danger Zone */}
          {isOwner && (
            <GlassCard style={styles.dangerCard}>
              <View style={styles.cardTitleRow}>
                <View>
                  <Text style={styles.dangerTitle}>Owner Controls</Text>
                  <Text style={styles.sectionDescription}>
                    Transfer or permanently remove this board
                  </Text>
                </View>
                <Ionicons name="warning-outline" size={24} color={Colors.error} />
              </View>

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
            Enter the email of the faculty member you want to transfer ownership to. You will be
            removed from this whiteboard.
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
          inviteCode={inviteCode}
          whiteboardName={
            whiteboard ? `${whiteboard.courseCode} - ${whiteboard.courseName}` : 'Whiteboard'
          }
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  courseCodeBadge: {
    borderRadius: 12,
    backgroundColor: 'rgba(187,39,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  courseCodeText: {
    color: Colors.primary,
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ownerBadgeText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
  },
  ownerBadgeTextActive: {
    color: Colors.success,
  },
  courseTitle: {
    color: Colors.text,
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
    lineHeight: Fonts.lineHeights.xxl,
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flex: 1,
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
    backgroundColor: 'rgba(187,39,68,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.3)',
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
  inlineQrBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  inlineQrUnavailable: {
    width: 152,
    height: 152,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inlineQrUnavailableText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
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
    minHeight: 64,
    paddingVertical: 10,
  },
  menuIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(187,39,68,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
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
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 54,
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
