import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import GlassModal from '../../components/ui/GlassModal';
import GlassInput from '../../components/ui/GlassInput';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useAuthStore } from '../../stores/authStore';
import { whiteboardService } from '../../services/whiteboardService';
import type { WhiteboardResponse } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { whiteboards, setWhiteboards, setLoading, isLoading } = useWhiteboardStore();
  const { user } = useAuthStore();
  const isFaculty = user?.role === 'FACULTY';

  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchWhiteboards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await whiteboardService.list(0, 50);
      setWhiteboards(response.content);
    } catch {
      // Use mock data if API is not available
      setWhiteboards([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWhiteboards();
    }, [fetchWhiteboards])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWhiteboards();
    setRefreshing(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await whiteboardService.joinByInviteCode(inviteCode.trim());
      setShowJoinModal(false);
      setInviteCode('');
      await fetchWhiteboards();
    } catch {
      // Handle error silently or show alert
    } finally {
      setJoining(false);
    }
  };

  const renderWhiteboardCard = ({ item }: { item: WhiteboardResponse }) => (
    <GlassCard
      style={styles.whiteboardCard}
      onPress={() => router.push(`/whiteboard/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.codeContainer}>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
        </View>
        {item.isDemo && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO</Text>
          </View>
        )}
      </View>

      <Text style={styles.courseName} numberOfLines={2}>
        {item.courseName}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>{"\u{1F4C5}"}</Text>
          <Text style={styles.metaText}>{item.semester}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>{"\u{1F465}"}</Text>
          <Text style={styles.metaText}>
            {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Welcome back{user ? `, ${user.firstName}` : ''}
            </Text>
            <Text style={styles.headerTitle}>Your Classes</Text>
          </View>
        </View>

        {/* Whiteboard List */}
        {isLoading && whiteboards.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={whiteboards}
            renderItem={renderWhiteboardCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              whiteboards.length === 0 && styles.emptyList,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon={"\u{1F4DA}"}
                title="No Classes Yet"
                subtitle="Join a class to start asking and answering questions"
                actionLabel="Join a Class"
                onAction={() => setShowJoinModal(true)}
              />
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setShowJoinModal(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        {/* Join Modal */}
        <GlassModal
          visible={showJoinModal}
          onClose={() => {
            setShowJoinModal(false);
            setInviteCode('');
          }}
          title={isFaculty ? 'Join or Create Class' : 'Join a Class'}
        >
          <GlassInput
            label="Invite Code"
            placeholder="Enter class invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />

          <GlassButton
            title="Join Class"
            onPress={handleJoin}
            loading={joining}
            disabled={joining || !inviteCode.trim()}
          />

          {isFaculty && (
            <>
              <View style={styles.modalDivider}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalDividerText}>OR</Text>
                <View style={styles.modalDividerLine} />
              </View>
              <GlassButton
                title="Create New Whiteboard"
                onPress={() => {
                  setShowJoinModal(false);
                  // Navigate to create whiteboard flow
                }}
                variant="secondary"
              />
            </>
          )}
        </GlassModal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
  },
  whiteboardCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeContainer: {
    backgroundColor: 'rgba(108,99,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  courseCode: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  demoBadge: {
    backgroundColor: 'rgba(255,187,51,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },
  courseName: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  metaText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '300',
    marginTop: -2,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modalDividerText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    paddingHorizontal: 12,
    fontWeight: '600',
  },
});
