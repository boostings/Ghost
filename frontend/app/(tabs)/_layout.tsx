import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { type AppColors, useThemeColors } from '../../constants/colors';
import { useNotificationStore } from '../../stores/notificationStore';

function TabBarIcon({
  name,
  focused,
  colors,
}: {
  name: string;
  focused: boolean;
  colors: AppColors;
}) {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    home: focused ? 'home' : 'home-outline',
    search: focused ? 'search' : 'search-outline',
    notifications: focused ? 'notifications' : 'notifications-outline',
    bookmarks: focused ? 'bookmark' : 'bookmark-outline',
    profile: focused ? 'person' : 'person-outline',
  };

  const labels: Record<string, string> = {
    home: 'Home',
    search: 'Search',
    notifications: 'Alerts',
    bookmarks: 'Saved',
    profile: 'Profile',
  };

  return (
    <View style={tabIconStyles.container}>
      <Ionicons
        name={icons[name] || 'help-circle-outline'}
        size={20}
        color={focused ? colors.primary : colors.textMuted}
        style={tabIconStyles.icon}
      />
      <Text
        style={[tabIconStyles.label, { color: focused ? colors.primary : colors.textMuted }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {labels[name] || name}
      </Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    paddingTop: 6,
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
    textAlign: 'center',
  },
});

function NotificationBadge({ colors }: { colors: AppColors }) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  if (unreadCount === 0) return null;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: colors.error }]}>
      <Text style={[badgeStyles.text, { color: colors.text }]}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default function TabLayout() {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.cardBg,
          borderTopWidth: 1,
          borderTopColor: colors.surfaceBorder,
          height: 85,
          paddingBottom: 20,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} colors={colors} />,
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="search" focused={focused} colors={colors} />
          ),
          tabBarAccessibilityLabel: 'Search tab',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabBarIcon name="notifications" focused={focused} colors={colors} />
              <NotificationBadge colors={colors} />
            </View>
          ),
          tabBarAccessibilityLabel: 'Notifications tab',
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bookmarks" focused={focused} colors={colors} />
          ),
          tabBarAccessibilityLabel: 'Bookmarks tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="profile" focused={focused} colors={colors} />
          ),
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tabs>
  );
}
