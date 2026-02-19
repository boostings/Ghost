import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { questionService } from '../../services/questionService';
import { topicService } from '../../services/topicService';
import { extractErrorMessage } from '../../hooks/useApi';
import { sanitizeSingleLine, sanitizeText } from '../../utils/sanitize';
import type { TopicResponse } from '../../types';

export default function EditQuestionScreen() {
  const router = useRouter();
  const { questionId, whiteboardId } = useLocalSearchParams<{
    questionId: string;
    whiteboardId: string;
  }>();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(undefined);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const fetchData = useCallback(async () => {
    if (!questionId || !whiteboardId) return;
    try {
      const [question, topicsData] = await Promise.all([
        questionService.getById(whiteboardId, questionId),
        topicService.list(whiteboardId),
      ]);
      setTitle(question.title);
      setBody(question.body);
      setSelectedTopicId(question.topicId || undefined);
      setTopics(topicsData || []);
    } catch {
      Alert.alert('Error', 'Failed to load question data.');
    } finally {
      setLoading(false);
    }
  }, [questionId, whiteboardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = (): boolean => {
    const newErrors: { title?: string; body?: string } = {};
    const normalizedTitle = sanitizeSingleLine(title);
    const normalizedBody = sanitizeText(body);

    if (!normalizedTitle) {
      newErrors.title = 'Title is required';
    } else if (normalizedTitle.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!normalizedBody) {
      newErrors.body = 'Question body is required';
    } else if (normalizedBody.length < 10) {
      newErrors.body = 'Please provide more detail (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !whiteboardId || !questionId) return;

    setSaving(true);
    try {
      const sanitizedTitle = sanitizeSingleLine(title);
      const sanitizedBody = sanitizeText(body);
      await questionService.update(whiteboardId, questionId, {
        title: sanitizedTitle,
        body: sanitizedBody,
        topicId: selectedTopicId,
      });
      router.back();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backArrow}>{'\u2190'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Question</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GlassCard style={styles.formCard}>
              {/* Title */}
              <GlassInput
                label="Title"
                placeholder="What's your question about?"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
                }}
                error={errors.title}
                maxLength={500}
                returnKeyType="next"
              />

              {/* Body */}
              <GlassInput
                label="Details"
                placeholder="Provide context and details..."
                value={body}
                onChangeText={(text) => {
                  setBody(text);
                  if (errors.body) setErrors((e) => ({ ...e, body: undefined }));
                }}
                multiline
                numberOfLines={6}
                error={errors.body}
              />

              {/* Topic Picker */}
              {topics.length > 0 && (
                <View style={styles.topicSection}>
                  <Text style={styles.topicLabel}>Topic</Text>
                  <View style={styles.topicList}>
                    <TouchableOpacity
                      style={[styles.topicChip, !selectedTopicId && styles.topicChipActive]}
                      onPress={() => setSelectedTopicId(undefined)}
                    >
                      <Text
                        style={[
                          styles.topicChipText,
                          !selectedTopicId && styles.topicChipTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {topics.map((topic) => (
                      <TouchableOpacity
                        key={topic.id}
                        style={[
                          styles.topicChip,
                          selectedTopicId === topic.id && styles.topicChipActive,
                        ]}
                        onPress={() => setSelectedTopicId(topic.id)}
                      >
                        <Text
                          style={[
                            styles.topicChipText,
                            selectedTopicId === topic.id && styles.topicChipTextActive,
                          ]}
                        >
                          {topic.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Save */}
              <GlassButton
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
              />
            </GlassCard>

            {/* Info Note */}
            <GlassCard style={styles.noteCard}>
              <Text style={styles.noteIcon}>{'\u{2139}\uFE0F'}</Text>
              <Text style={styles.noteText}>
                Questions can only be edited before a verified answer is provided. Once a faculty
                member verifies an answer, the question will be locked.
              </Text>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
  formCard: {
    marginBottom: 16,
  },
  topicSection: {
    marginBottom: 16,
  },
  topicLabel: {
    fontSize: Fonts.sizes.md,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  topicList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topicChipActive: {
    backgroundColor: 'rgba(187,39,68,0.25)',
    borderColor: Colors.primary,
  },
  topicChipText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  topicChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
