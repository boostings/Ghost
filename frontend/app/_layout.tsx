import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/colors';
import { ErrorBoundary, NetworkStatusBanner } from '../components';
import { useNotifications } from '../hooks/useNotifications';
import { whiteboardService } from '../services/whiteboardService';

function RootLayoutNav() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();
  const router = useRouter();
  const [hasJoinedWhiteboard, setHasJoinedWhiteboard] = useState<boolean | null>(null);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const segmentPath = segments.join('/');
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segmentPath === '(auth)/onboarding';

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setHasJoinedWhiteboard(null);
      setIsMembershipLoading(false);
      return;
    }

    if (!inAuthGroup && hasJoinedWhiteboard === true) {
      return;
    }

    let cancelled = false;
    const checkMembership = async () => {
      setIsMembershipLoading(true);
      try {
        const page = await whiteboardService.getWhiteboards({ page: 0, size: 1 });
        if (!cancelled) {
          setHasJoinedWhiteboard(page.totalElements > 0);
        }
      } catch {
        if (!cancelled) {
          // Do not block navigation if membership check fails temporarily.
          setHasJoinedWhiteboard(true);
        }
      } finally {
        if (!cancelled) {
          setIsMembershipLoading(false);
        }
      }
    };

    void checkMembership();
    return () => {
      cancelled = true;
    };
  }, [hasJoinedWhiteboard, inAuthGroup, isAuthenticated, isLoading, segmentPath]);

  useEffect(() => {
    if (isLoading || isMembershipLoading) {
      return;
    }

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (hasJoinedWhiteboard === false) {
      if (!inOnboarding) {
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    if (inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [
    hasJoinedWhiteboard,
    inAuthGroup,
    inOnboarding,
    isAuthenticated,
    isLoading,
    isMembershipLoading,
    router,
  ]);

  if (isLoading || (inAuthGroup && isMembershipLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="whiteboard/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="whiteboard/settings"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="whiteboard/create"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="whiteboard/members"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="whiteboard/audit-log"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="whiteboard/topics"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="question/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="question/create"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="question/edit"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="moderation/reports"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useNotifications();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <NetworkStatusBanner />
        <RootLayoutNav />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
