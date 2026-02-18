import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useNotificationStore } from '../../stores/notificationStore';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '\u2302',
    search: '\u2315',
    notifications: '\u2407',
    bookmarks: '\u2606',
    profile: '\u263A',
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
      <Text
        style={[
          tabIconStyles.icon,
          { color: focused ? Colors.primary : Colors.textMuted },
        ]}
      >
        {icons[name] || '?'}
      </Text>
      <Text
        style={[
          tabIconStyles.label,
          { color: focused ? Colors.primary : Colors.textMuted },
        ]}
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
    paddingTop: 6,
  },
  icon: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
});

function NotificationBadge() {
  const { unreadCount } = useNotificationStore();

  if (unreadCount === 0) return null;

  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>
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
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(26,26,46,0.92)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.10)',
          height: 85,
          paddingBottom: 20,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabBarIcon name="notifications" focused={focused} />
              <NotificationBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="bookmarks" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
