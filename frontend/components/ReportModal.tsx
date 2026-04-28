import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import GlassModal from './ui/GlassModal';
import { Colors, useThemeColors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { reportService } from '../services/reportService';
import { extractErrorMessage } from '../hooks/useApi';
import type { ReportReason } from '../types';

interface ReportTarget {
  questionId?: string;
  commentId?: string;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  target: ReportTarget | null;
  title: string;
  onSubmitted?: () => void;
}

const REPORT_REASON_OPTIONS: { label: string; value: ReportReason; description: string }[] = [
  { label: 'Spam', value: 'SPAM', description: 'Promotional or repetitive content.' },
  { label: 'Inappropriate', value: 'INAPPROPRIATE', description: 'Offensive or explicit content.' },
  { label: 'Harassment', value: 'HARASSMENT', description: 'Bullying or targeted abuse.' },
  { label: 'Off Topic', value: 'OFF_TOPIC', description: 'Not related to this class discussion.' },
  { label: 'Other', value: 'OTHER', description: 'Something else that needs faculty review.' },
];

const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  target,
  title,
  onSubmitted,
}) => {
  const colors = useThemeColors();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setNotes('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!target?.questionId && !target?.commentId) {
      Alert.alert('Report', 'Missing report target.');
      return;
    }
    if (!reason) {
      Alert.alert('Report', 'Please select a reason.');
      return;
    }

    setSubmitting(true);
    try {
      const trimmedNotes = notes.trim();
      await reportService.create({
        ...target,
        reason,
        notes: trimmedNotes ? trimmedNotes : undefined,
      });
      onClose();
      onSubmitted?.();
      Alert.alert('Reported', 'Thank you for your report. Faculty will review it.');
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <TouchableOpacity
      onPress={handleSubmit}
      style={[
        styles.submitButton,
        { backgroundColor: colors.primary },
        (!reason || submitting) && styles.submitButtonDisabled,
      ]}
      disabled={!reason || submitting}
      accessibilityRole="button"
      accessibilityLabel="Send report"
    >
      {submitting ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={[styles.submitText, { color: '#FFFFFF' }]}>Send</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <GlassModal visible={visible} onClose={onClose} title={title} footer={footer}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Select the reason and add optional context for faculty moderators.
      </Text>

      <View style={styles.reasonList}>
        {REPORT_REASON_OPTIONS.map((option) => {
          const active = reason === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.reasonOption,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                },
                active && {
                  backgroundColor: `${colors.primary}26`,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setReason(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`Report reason: ${option.label}`}
            >
              <Text style={[styles.reasonLabel, { color: active ? colors.primary : colors.text }]}>
                {option.label}
              </Text>
              <Text style={[styles.reasonDescription, { color: colors.textMuted }]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
      <TextInput
        style={[
          styles.notesInput,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        placeholder="Add context for faculty review..."
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
        selectionColor={colors.primary}
      />
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  reasonList: {
    gap: 8,
    marginBottom: 14,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reasonOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.22)',
  },
  reasonLabel: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  reasonLabelActive: {
    color: Colors.primary,
  },
  reasonDescription: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  notesLabel: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  notesInput: {
    minHeight: 86,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  submitButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '700',
  },
});

export default ReportModal;
