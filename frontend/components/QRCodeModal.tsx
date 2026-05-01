import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Share, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import GlassModal from './ui/GlassModal';
import GlassButton from './ui/GlassButton';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  inviteCode: string;
  whiteboardName: string;
  subtitle?: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  inviteCode,
  whiteboardName,
  subtitle,
}) => {
  const deepLink = `ghost://join/${inviteCode}`;
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      // Use Share as a cross-platform fallback when expo-clipboard is not available
      await Share.share({ message: inviteCode });
      setCopied(true);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet may be unavailable on some devices.
      setCopied(false);
    }
  }, [inviteCode]);

  const handleShareLink = useCallback(async () => {
    try {
      await Share.share({
        message: `Join my class "${whiteboardName}" on Ghost! Use invite code: ${inviteCode}\n\n${deepLink}`,
        title: `Join ${whiteboardName} on Ghost`,
      });
    } catch {
      // User cancelled or share failed
    }
  }, [whiteboardName, inviteCode, deepLink]);

  return (
    <GlassModal visible={visible} onClose={onClose} title={whiteboardName}>
      <View style={styles.content}>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrBackground}>
            <QRCode value={deepLink} size={172} backgroundColor="#FFFFFF" color="#111827" />
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>Scan this QR code to join the whiteboard</Text>

        {/* Invite Code */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Invite Code</Text>
          <TouchableOpacity
            onPress={handleCopyCode}
            style={styles.codeBox}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Share invite code"
          >
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Text style={styles.copyHint}>{copied ? 'Copied!' : 'Tap to share code'}</Text>
          </TouchableOpacity>
        </View>

        {/* Share Button */}
        <View style={styles.shareSection}>
          <GlassButton
            title="Share Link"
            onPress={handleShareLink}
            variant="primary"
            icon={<Ionicons name="link-outline" size={18} color="#FFFFFF" />}
          />
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  subtitle: {
    alignSelf: 'stretch',
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: -2,
    marginBottom: 10,
  },
  qrContainer: {
    marginBottom: 14,
  },
  qrBackground: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
  },
  instructions: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.regular.fontWeight,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeSection: {
    width: '100%',
    marginBottom: 14,
  },
  codeLabel: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
    marginBottom: 8,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  codeText: {
    color: Colors.text,
    fontSize: Fonts.sizes.xl,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: Fonts.bold.fontWeight,
    letterSpacing: 2,
  },
  copyHint: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.regular.fontWeight,
    marginTop: 4,
  },
  shareSection: {
    width: '100%',
  },
});

export default QRCodeModal;
