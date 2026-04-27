import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import GlassModal from '../ui/GlassModal';
import { AnimatedIcon } from '../AnimatedIcon';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { whiteboardService } from '../../services/whiteboardService';
import { haptic } from '../../utils/haptics';
import type { MemberResponse } from '../../types';

interface ContactFacultySheetProps {
  visible: boolean;
  onClose: () => void;
  whiteboardId?: string;
}

export const ContactFacultySheet: React.FC<ContactFacultySheetProps> = ({
  visible,
  onClose,
  whiteboardId,
}) => {
  const [faculty, setFaculty] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !whiteboardId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    whiteboardService
      .getMembers(whiteboardId)
      .then((members) => {
        if (cancelled) return;
        setFaculty(members.filter((member) => member.role === 'FACULTY'));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load faculty.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, whiteboardId]);

  const handleEmail = (email: string) => {
    haptic.light();
    Linking.openURL(`mailto:${email}`).catch(() => {
      // Best-effort: nothing to do if no mail client.
    });
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Contact faculty">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : faculty.length === 0 ? (
        <Text style={styles.empty}>No faculty listed for this class yet.</Text>
      ) : (
        faculty.map((member) => {
          const initials =
            `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase();
          const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
          return (
            <Pressable
              key={member.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => handleEmail(member.email)}
              accessibilityRole="button"
              accessibilityLabel={`Email ${fullName}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || '?'}</Text>
              </View>
              <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {member.email}
                </Text>
              </View>
              <AnimatedIcon name="mail-outline" size={18} color={Colors.primary} motion="none" />
            </Pressable>
          );
        })
      )}
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  center: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: Colors.error,
    fontSize: Fonts.sizes.sm,
    paddingVertical: 12,
    textAlign: 'center',
  },
  empty: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    paddingVertical: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(187,39,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Fonts.sizes.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  email: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
});

export default ContactFacultySheet;
