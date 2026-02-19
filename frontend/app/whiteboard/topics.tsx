import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import EmptyState from '../../components/ui/EmptyState';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { topicService } from '../../services/topicService';
import { extractErrorMessage } from '../../hooks/useApi';
import { sanitizeSingleLine } from '../../utils/sanitize';
import type { TopicResponse } from '../../types';

export default function TopicsScreen() {
  const router = useRouter();
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();

  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTopicName, setNewTopicName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!whiteboardId) return;
    try {
      const response = await topicService.list(whiteboardId);
      setTopics(response);
      setLoadError(null);
    } catch {
      setTopics([]);
      setLoadError('Failed to load topics.');
    } finally {
      setLoading(false);
    }
  }, [whiteboardId]);

  useFocusEffect(
    useCallback(() => {
      fetchTopics();
    }, [fetchTopics])
  );

  const handleCreateTopic = async () => {
    const sanitizedTopicName = sanitizeSingleLine(newTopicName);
    if (!sanitizedTopicName || !whiteboardId) return;

    setCreating(true);
    try {
      const topic = await topicService.create(whiteboardId, sanitizedTopicName);
      setTopics((prev) => [...prev, topic]);
      setNewTopicName('');
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTopic = (topic: TopicResponse) => {
    if (topic.isDefault) {
      Alert.alert('Cannot Delete', 'Default topics cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Topic',
      `Delete "${topic.name}"? Questions with this topic will remain but lose their topic tag.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!whiteboardId) {
                return;
              }
              await topicService.remove(whiteboardId, topic.id);
              setTopics((prev) => prev.filter((t) => t.id !== topic.id));
            } catch {
              Alert.alert('Error', 'Failed to delete topic.');
            }
          },
        },
      ]
    );
  };

  const defaultTopics = topics.filter((t) => t.isDefault);
  const customTopics = topics.filter((t) => !t.isDefault);

  const renderTopicItem = ({ item }: { item: TopicResponse }) => (
    <View style={styles.topicRow}>
      <View
        style={[
          styles.topicDot,
          { backgroundColor: item.isDefault ? Colors.primary : Colors.primaryLight },
        ]}
      />
      <Text style={styles.topicName}>{item.name}</Text>
      {item.isDefault ? (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => handleDeleteTopic(item)}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel={`Delete topic ${item.name}`}
        >
          <Text style={styles.deleteText}>{"\u2715"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const orderedTopics = useMemo(
    () => [...defaultTopics, ...customTopics],
    [customTopics, defaultTopics]
  );

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
          <Text style={styles.headerTitle}>Manage Topics</Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={orderedTopics}
          renderItem={renderTopicItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Add Topic */}
              <GlassCard style={styles.addCard}>
                <Text style={styles.addTitle}>Add Custom Topic</Text>
                <View style={styles.addRow}>
                  <View style={styles.addInputContainer}>
                    <GlassInput
                      placeholder="Topic name (e.g., Project)"
                      value={newTopicName}
                      onChangeText={setNewTopicName}
                      returnKeyType="done"
                      onSubmitEditing={handleCreateTopic}
                      style={styles.addInput}
                    />
                  </View>
                  <GlassButton
                    title="Add"
                    onPress={handleCreateTopic}
                    loading={creating}
                    disabled={creating || !newTopicName.trim()}
                  />
                </View>
              </GlassCard>

              {/* Section Labels */}
              {defaultTopics.length > 0 && (
                <Text style={styles.sectionLabel}>Default Topics</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              icon={"\u{1F3F7}\uFE0F"}
              title="No Topics"
              subtitle={loadError || 'Add topics to help organize questions'}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addCard: {
    marginBottom: 20,
  },
  addTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addInputContainer: {
    flex: 1,
  },
  addInput: {
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  topicName: {
    flex: 1,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  defaultBadge: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '700',
  },
  separator: {
    height: 8,
  },
});
