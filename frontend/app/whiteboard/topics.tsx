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
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import EmptyState from '../../components/ui/EmptyState';
import SettingsHeader from '../../components/whiteboard/SettingsHeader';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { topicService } from '../../services/topicService';
import { extractErrorMessage } from '../../hooks/useApi';
import { sanitizeSingleLine } from '../../utils/sanitize';
import type { TopicResponse } from '../../types';

export default function TopicsScreen() {
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
            } catch (error: unknown) {
              Alert.alert('Error', extractErrorMessage(error));
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
          styles.topicIcon,
          item.isDefault ? styles.defaultTopicIcon : styles.customTopicIcon,
        ]}
      >
        <Ionicons
          name={item.isDefault ? 'lock-closed-outline' : 'pricetag-outline'}
          size={16}
          color={item.isDefault ? Colors.primary : Colors.primaryLight}
        />
      </View>
      <View style={styles.topicContent}>
        <Text style={styles.topicName}>{item.name}</Text>
        <Text style={styles.topicMeta}>{item.isDefault ? 'Built in topic' : 'Custom topic'}</Text>
      </View>
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
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
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
          title="Topics"
          subtitle="Question organization"
          rightElement={<Text style={styles.topicCount}>{topics.length}</Text>}
        />

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
                <View style={styles.addHeader}>
                  <View>
                    <Text style={styles.addTitle}>Add Custom Topic</Text>
                    <Text style={styles.addSubtitle}>
                      Create class-specific labels for questions
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.addRow}>
                  <View style={styles.addInputContainer}>
                    <GlassInput
                      placeholder="Topic name (e.g., Project)"
                      value={newTopicName}
                      onChangeText={setNewTopicName}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleCreateTopic}
                      style={styles.addInput}
                    />
                  </View>
                  <View style={styles.addButtonContainer}>
                    <GlassButton
                      title="Add"
                      onPress={handleCreateTopic}
                      loading={creating}
                      disabled={creating || !newTopicName.trim()}
                    />
                  </View>
                </View>
              </GlassCard>

              {/* Section Labels */}
              {defaultTopics.length > 0 && <Text style={styles.sectionLabel}>Default Topics</Text>}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              ionIcon="pricetag-outline"
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
  topicCount: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addCard: {
    marginBottom: 20,
  },
  addHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  addTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  addSubtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addInputContainer: {
    flex: 1,
    minWidth: 0,
  },
  addInput: {
    marginBottom: 0,
  },
  addButtonContainer: {
    width: 96,
    flexShrink: 0,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  topicIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  defaultTopicIcon: {
    backgroundColor: 'rgba(187,39,68,0.14)',
  },
  customTopicIcon: {
    backgroundColor: 'rgba(212,85,109,0.14)',
  },
  topicContent: {
    flex: 1,
    minWidth: 0,
  },
  topicName: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  topicMeta: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: 'rgba(187,39,68,0.15)',
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 8,
  },
});
