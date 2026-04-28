import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import SettingsHeader from '../../components/whiteboard/SettingsHeader';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { whiteboardService } from '../../services/whiteboardService';
import { formatDate } from '../../utils/formatDate';
import type { MemberResponse, JoinRequestResponse } from '../../types';

export default function MembersScreen() {
  const { whiteboardId } = useLocalSearchParams<{ whiteboardId: string }>();
  const user = useAuthStore((state) => state.user);
  const isFaculty = user?.role === 'FACULTY';

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!whiteboardId) return;
    try {
      const membersData = await whiteboardService.getMembers(whiteboardId);
      setMembers(membersData);
      if (isFaculty) {
        const requests = await whiteboardService.getJoinRequests(whiteboardId);
        setJoinRequests(requests);
      }
      setLoadError(null);
    } catch {
      setMembers([]);
      setJoinRequests([]);
      setLoadError('Failed to load members. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [whiteboardId, isFaculty]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRemoveMember = (member: MemberResponse) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.firstName} ${member.lastName} from this whiteboard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!whiteboardId) {
              return;
            }
            try {
              await whiteboardService.removeMember(whiteboardId, member.userId);
              setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
            } catch {
              Alert.alert('Error', 'Failed to remove member.');
            }
          },
        },
      ]
    );
  };

  const handleReviewRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!whiteboardId) {
      return;
    }
    try {
      await whiteboardService.reviewJoinRequest(whiteboardId, requestId, status);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (status === 'APPROVED') {
        await fetchData(); // Refresh members
      }
    } catch {
      Alert.alert('Error', `Failed to ${status.toLowerCase()} request.`);
    }
  };

  const facultyMembers = members.filter((m) => m.role === 'FACULTY');
  const studentMembers = members.filter((m) => m.role === 'STUDENT');
  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');

  const renderMemberItem = (member: MemberResponse) => (
    <View key={member.id} style={styles.memberRow}>
      <Avatar firstName={member.firstName} lastName={member.lastName} size={40} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.firstName} {member.lastName}
        </Text>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      <View style={styles.memberBadge}>
        <Text
          style={[
            styles.memberRole,
            member.role === 'FACULTY' ? styles.facultyRole : styles.studentRole,
          ]}
        >
          {member.role}
        </Text>
      </View>
      {isFaculty && member.userId !== user?.id && member.role !== 'FACULTY' && (
        <TouchableOpacity
          onPress={() => handleRemoveMember(member)}
          style={styles.removeButton}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${member.firstName} ${member.lastName}`}
        >
          <Ionicons name="person-remove-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      )}
    </View>
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
          title="Members"
          subtitle="Roster and join requests"
          rightElement={<Text style={styles.memberCount}>{members.length}</Text>}
        />

        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <>
              <GlassCard style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="school-outline" size={20} color={Colors.warning} />
                    <Text style={styles.summaryValue}>{facultyMembers.length}</Text>
                    <Text style={styles.summaryLabel}>Faculty</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Ionicons name="people-outline" size={20} color={Colors.primary} />
                    <Text style={styles.summaryValue}>{studentMembers.length}</Text>
                    <Text style={styles.summaryLabel}>
                      {studentMembers.length === 1 ? 'Student' : 'Students'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Ionicons name="time-outline" size={20} color={Colors.warning} />
                    <Text style={styles.summaryValue}>{pendingRequests.length}</Text>
                    <Text style={styles.summaryLabel}>Pending</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Pending Join Requests */}
              {isFaculty && pendingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Pending Requests ({pendingRequests.length})
                  </Text>
                  <GlassCard style={styles.card}>
                    {pendingRequests.map((request) => (
                      <View key={request.id} style={styles.requestRow}>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestName}>{request.userName}</Text>
                          <Text style={styles.requestEmail}>{request.userEmail}</Text>
                          <Text style={styles.requestDate}>
                            Requested {formatDate(request.createdAt)}
                          </Text>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={styles.approveButton}
                            onPress={() => handleReviewRequest(request.id, 'APPROVED')}
                            accessibilityRole="button"
                            accessibilityLabel={`Approve ${request.userName}`}
                          >
                            <Ionicons name="checkmark" size={22} color={Colors.success} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={() => handleReviewRequest(request.id, 'REJECTED')}
                            accessibilityRole="button"
                            accessibilityLabel={`Reject ${request.userName}`}
                          >
                            <Ionicons name="close" size={22} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </GlassCard>
                </View>
              )}

              {/* Faculty */}
              {facultyMembers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Faculty ({facultyMembers.length})</Text>
                  <GlassCard style={styles.card}>{facultyMembers.map(renderMemberItem)}</GlassCard>
                </View>
              )}

              {/* Students */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Students ({studentMembers.length})</Text>
                {studentMembers.length > 0 ? (
                  <GlassCard style={styles.card}>{studentMembers.map(renderMemberItem)}</GlassCard>
                ) : (
                  <EmptyState
                    ionIcon="people-outline"
                    title="No Students"
                    subtitle={loadError || 'Share the invite code to get students to join'}
                  />
                )}
              </View>
            </>
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
  memberCount: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryValue: {
    color: Colors.text,
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    // default padding from GlassCard
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  memberEmail: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  memberBadge: {
    marginLeft: 8,
  },
  memberRole: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  facultyRole: {
    color: '#FF9800',
    backgroundColor: 'rgba(255,152,0,0.15)',
  },
  studentRole: {
    color: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.15)',
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  requestEmail: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  requestDate: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,200,81,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
