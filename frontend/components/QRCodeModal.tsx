import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import GlassModal from './ui/GlassModal';
import GlassButton from './ui/GlassButton';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  inviteCode: string;
  whiteboardName: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  inviteCode,
  whiteboardName,
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
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={whiteboardName}
    >
      <View style={styles.content}>
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrBackground}>
            <QRCode
              value={deepLink}
              size={200}
              backgroundColor="#FFFFFF"
              color="#1A1A2E"
            />
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          Scan this QR code to join the whiteboard
        </Text>

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
            <Text style={styles.copyHint}>
              {copied ? 'Copied!' : 'Tap to share code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share Button */}
        <View style={styles.shareSection}>
          <GlassButton
            title="Share Link"
            onPress={handleShareLink}
            variant="primary"
            icon={<Text style={styles.shareIcon}>🔗</Text>}
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
  qrContainer: {
    marginBottom: 20,
  },
  qrBackground: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  instructions: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.regular.fontWeight,
    textAlign: 'center',
    marginBottom: 24,
  },
  codeSection: {
    width: '100%',
    marginBottom: 24,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  codeText: {
    color: Colors.text,
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.bold.fontWeight,
    letterSpacing: 4,
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
  shareIcon: {
    fontSize: 16,
  },
});

export default QRCodeModal;
