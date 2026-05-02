import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ui/ScreenHeader';
import GlassCard from '../../components/ui/GlassCard';
import { AnimatedIcon } from '../../components/AnimatedIcon';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { notificationService } from '../../services/notificationService';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { smartTitleCase } from '../../utils/titleCase';
import type { EmailDigest, NotificationPreferencesResponse, PushFrequency } from '../../types';

const PUSH_OPTIONS: Array<{ label: string; value: PushFrequency }> = [
  { label: 'Realtime', value: 'REALTIME' },
  { label: 'Hourly', value: 'HOURLY' },
  { label: 'Off', value: 'OFF' },
];

const DIGEST_OPTIONS: Array<{ label: string; value: EmailDigest }> = [
  { label: 'Off', value: 'OFF' },
  { label: 'Daily 7am', value: 'DAILY_7AM' },
  { label: 'Weekly Mon 7am', value: 'WEEKLY_MON_7AM' },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const whiteboards = useWhiteboardStore((state) => state.whiteboards);
  const [pushFrequency, setPushFrequency] = useState<PushFrequency>('REALTIME');
  const [emailDigest, setEmailDigest] = useState<EmailDigest>('DAILY_7AM');
  const [mutedWhiteboards, setMutedWhiteboards] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  const sortedWhiteboards = useMemo(
    () => [...whiteboards].sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    [whiteboards]
  );

  useEffect(() => {
    let active = true;

    notificationService
      .getPreferences()
      .then((preferences) => {
        if (active) {
          applyPreferences(preferences);
        }
      })
      .catch(() => {
        if (active) {
          Alert.alert('Error', 'Could not load notification preferences.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const applyPreferences = (preferences: NotificationPreferencesResponse) => {
    setPushFrequency(preferences.pushFrequency);
    setEmailDigest(preferences.emailDigest);
    setMutedWhiteboards(
      Object.fromEntries(
        preferences.classOverrides.map((override) => [override.whiteboardId, override.mutedUntil])
      )
    );
  };

  const updatePreferences = async (
    nextPushFrequency: PushFrequency,
    nextEmailDigest: EmailDigest
  ) => {
    const previousPushFrequency = pushFrequency;
    const previousEmailDigest = emailDigest;
    setPushFrequency(nextPushFrequency);
    setEmailDigest(nextEmailDigest);

    try {
      const preferences = await notificationService.updatePreferences(
        nextPushFrequency,
        nextEmailDigest
      );
      applyPreferences(preferences);
    } catch {
      setPushFrequency(previousPushFrequency);
      setEmailDigest(previousEmailDigest);
      Alert.alert('Error', 'Could not save notification preferences.');
    }
  };

  const toggleMute = async (whiteboardId: string) => {
    const previousMutedWhiteboards = mutedWhiteboards;
    const shouldMute = !mutedWhiteboards[whiteboardId];
    setMutedWhiteboards((current) => ({
      ...current,
      [whiteboardId]: shouldMute ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    }));

    try {
      const preferences = await notificationService.updateClassOverride(whiteboardId, shouldMute);
      applyPreferences(preferences);
    } catch {
      setMutedWhiteboards(previousMutedWhiteboards);
      Alert.alert('Error', 'Could not update class notification override.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primary}24`, colors.background, colors.background] as const}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Notification Preferences"
          onBack={() => router.back()}
          border={false}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PreferenceCard title="Push frequency">
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <SegmentedOptions
                options={PUSH_OPTIONS}
                value={pushFrequency}
                onChange={(value) => updatePreferences(value, emailDigest)}
              />
            )}
          </PreferenceCard>

          <PreferenceCard title="Email digest">
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <SegmentedOptions
                options={DIGEST_OPTIONS}
                value={emailDigest}
                onChange={(value) => updatePreferences(pushFrequency, value)}
              />
            )}
          </PreferenceCard>

          <PreferenceCard title="Per-class overrides">
            {sortedWhiteboards.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Join a class to manage class-specific notification overrides.
              </Text>
            ) : (
              sortedWhiteboards.map((whiteboard) => {
                const mutedUntil = mutedWhiteboards[whiteboard.id];
                const muted = mutedUntil != null && new Date(mutedUntil).getTime() > Date.now();
                return (
                  <View
                    key={whiteboard.id}
                    style={[styles.classRow, { borderBottomColor: colors.surfaceBorder }]}
                  >
                    <View style={styles.classCopy}>
                      <Text style={[styles.classCode, { color: colors.primary }]}>
                        {whiteboard.courseCode}
                      </Text>
                      <Text style={[styles.className, { color: colors.text }]} numberOfLines={1}>
                        {smartTitleCase(whiteboard.courseName)}
                      </Text>
                      <Text style={[styles.classMeta, { color: colors.textMuted }]}>
                        {muted ? 'Muted for 24h' : 'Default notifications'}
                      </Text>
                    </View>
                    <Switch
                      value={muted}
                      onValueChange={() => toggleMute(whiteboard.id)}
                      trackColor={{ false: colors.surfaceBorder, true: `${colors.primary}80` }}
                      thumbColor={muted ? colors.primary : colors.textMuted}
                      accessibilityLabel={`Mute ${whiteboard.courseCode} for 24 hours`}
                    />
                  </View>
                );
              })
            )}
          </PreferenceCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PreferenceCard({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </GlassCard>
  );
}

function SegmentedOptions<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: selected ? colors.primary : colors.surfaceLight,
                borderColor: selected ? colors.primary : colors.surfaceBorder,
              },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            {selected ? (
              <AnimatedIcon name="checkmark" size={13} color="#FFFFFF" motion="none" />
            ) : null}
            <Text style={[styles.segmentText, { color: selected ? '#FFFFFF' : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 14,
  },
  card: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '900',
    marginBottom: 14,
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: Fonts.sizes.sm,
    lineHeight: 20,
  },
  classRow: {
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  classCopy: {
    flex: 1,
    minWidth: 0,
  },
  classCode: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  className: {
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
  },
  classMeta: {
    fontSize: Fonts.sizes.xs,
    marginTop: 3,
  },
});
