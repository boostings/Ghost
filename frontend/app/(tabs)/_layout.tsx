import React, { useEffect, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  Text,
  useColorScheme,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { type AppColors, useThemeColors } from '../../constants/colors';
import { Duration, Ease, PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';
import { useNotificationStore } from '../../stores/notificationStore';

// ---------- Tab descriptors ----------
//
// Keep this list as the source of truth for which routes appear in the bar
// and what icons they use. The order here drives the visual order of the
// pill slots (left → right). `search` is a hidden route — present in the
// route tree but not in the bar (managed below via Tabs.Screen with
// href: null).

type TabDescriptor = {
  name: 'home' | 'notifications' | 'bookmarks' | 'profile';
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDescriptor[] = [
  {
    name: 'home',
    label: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    name: 'notifications',
    label: 'Alerts',
    iconActive: 'notifications',
    iconInactive: 'notifications-outline',
  },
  {
    name: 'bookmarks',
    label: 'Saved',
    iconActive: 'bookmark',
    iconInactive: 'bookmark-outline',
  },
  {
    name: 'profile',
    label: 'Profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

// ---------- Visual constants ----------

const BAR_HORIZONTAL_MARGIN = 16;
const BAR_VERTICAL_PADDING = 6;
const BAR_HEIGHT = 60;
const BAR_RADIUS = 30;
const PILL_INSET = 6;

// ---------- Custom tab bar ----------

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // Filter the routes to only the ones we want to render. Keeps "search"
  // (registered with href:null) out of the bar even if React Navigation still
  // surfaces it in `state.routes`.
  const visible = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => TABS.some((t) => t.name === (route.name as TabDescriptor['name'])));
  const slotCount = visible.length;

  // The active pill indicator slides between tab slots. It animates a
  // shared `progress` (0..slotCount-1) so the underlying transform is
  // pure translateX — hardware-accelerated and never re-lays out children
  // (Emil: props-transform-opacity, transform-percentage-translate).
  const activeVisibleIndex = Math.max(
    0,
    visible.findIndex(({ index }) => index === state.index)
  );
  const progress = useSharedValue(activeVisibleIndex);

  // Slot width is measured at runtime so we can translate the pill in
  // pixels (RN Animated transforms don't accept percentage strings).
  const [slotWidth, setSlotWidth] = useState(0);
  const onTrackLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSlotWidth(slotCount > 0 ? width / slotCount : 0);
  };

  useEffect(() => {
    if (reduceMotion) {
      // polish-dont-remove-all: keep some motion but skip the spring.
      progress.value = withTiming(activeVisibleIndex, {
        duration: Duration.fast,
        easing: Ease.out,
      });
    } else {
      progress.value = withSpring(activeVisibleIndex, Spring.gentle);
    }
  }, [activeVisibleIndex, progress, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * slotWidth }],
  }));

  const renderTab = ({ route, index }: { route: (typeof state.routes)[number]; index: number }) => {
    const descriptor = descriptors[route.key];
    const focused = state.index === index;
    const tabConfig = TABS.find((t) => t.name === (route.name as TabDescriptor['name']));
    if (!tabConfig) return null;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      haptic.selection();
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    return (
      <TabSlot
        key={route.key}
        focused={focused}
        colors={colors}
        label={tabConfig.label}
        iconActive={tabConfig.iconActive}
        iconInactive={tabConfig.iconInactive}
        showBadge={tabConfig.name === 'notifications'}
        accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? `${tabConfig.label} tab`}
        onPress={onPress}
        onLongPress={onLongPress}
        reduceMotion={reduceMotion}
      />
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.surfaceBorder,
            shadowColor: '#000',
          },
        ]}
      >
        <BlurView
          intensity={70}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.barBlur]}
        />

        {/* Sliding pill behind the active tab. */}
        <View style={styles.pillTrack} pointerEvents="none" onLayout={onTrackLayout}>
          <Animated.View
            style={[
              styles.pillFill,
              {
                width: slotWidth,
                backgroundColor: `${colors.primary}1F`,
                borderColor: `${colors.primary}33`,
              },
              pillStyle,
            ]}
          />
        </View>

        {/* The actual tab buttons. */}
        <View style={styles.row}>{visible.map(renderTab)}</View>
      </View>
    </View>
  );
}

// ---------- Single tab slot ----------

function TabSlot({
  focused,
  colors,
  label,
  iconActive,
  iconInactive,
  showBadge,
  accessibilityLabel,
  onPress,
  onLongPress,
  reduceMotion,
}: {
  focused: boolean;
  colors: AppColors;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  showBadge: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress: () => void;
  reduceMotion: boolean;
}) {
  // Two shared values:
  //   - `pressed` — scales to 0.96 while finger is down (Emil: transform-scale-097)
  //   - `focusScale` — small lift when this slot becomes active (1.0 → 1.05)
  const pressed = useSharedValue(0);
  const focusScale = useSharedValue(focused ? 1 : 0.94);

  useEffect(() => {
    if (reduceMotion) {
      focusScale.value = withTiming(focused ? 1 : 0.96, {
        duration: Duration.fast,
        easing: Ease.out,
      });
    } else {
      focusScale.value = withSpring(focused ? 1 : 0.94, Spring.gentle);
    }
  }, [focused, focusScale, reduceMotion]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusScale.value * (1 - pressed.value * (1 - PRESSED_SCALE)) }],
  }));

  const labelColor = focused ? colors.primary : colors.textMuted;
  const iconName = focused ? iconActive : iconInactive;
  const iconColor = focused ? colors.primary : colors.textMuted;

  return (
    <Pressable
      style={styles.slot}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80, easing: Ease.out });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 160, easing: Ease.out });
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.iconWrap, animatedIconStyle]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
        {showBadge ? <NotificationBadge colors={colors} /> : null}
      </Animated.View>
      <Text
        style={[styles.label, { color: labelColor }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- Notification badge ----------

function NotificationBadge({ colors }: { colors: AppColors }) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  if (unreadCount === 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.cardBg }]}>
      <Text style={styles.badgeText} allowFontScaling={false}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
}

// ---------- Layout entry ----------

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="bookmarks" />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    marginHorizontal: BAR_HORIZONTAL_MARGIN,
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    // iOS shadow
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    // Android elevation
    elevation: 12,
  },
  barBlur: {
    borderRadius: BAR_RADIUS,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: BAR_VERTICAL_PADDING,
    paddingHorizontal: PILL_INSET,
  },
  pillTrack: {
    position: 'absolute',
    top: PILL_INSET,
    left: PILL_INSET,
    right: PILL_INSET,
    bottom: PILL_INSET,
    flexDirection: 'row',
  },
  pillSlot: {
    height: '100%',
    flexDirection: 'row',
  },
  pillFill: {
    borderRadius: 24,
    borderWidth: 1,
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 32,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
