import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, useColorScheme } from 'react-native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { useThemeColors } from '../constants/colors';
import { ErrorBoundary, NetworkStatusBanner } from '../components';
import { useNotifications } from '../hooks/useNotifications';
import { whiteboardService } from '../services/whiteboardService';
import { getAuthRedirectTarget } from '../utils/authRedirect';

function RootLayoutNav() {
  const colors = useThemeColors();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isRouterReady = rootNavigationState?.key != null;
  const [isLayoutMounted, setIsLayoutMounted] = useState(false);
  const [hasJoinedWhiteboard, setHasJoinedWhiteboard] = useState<boolean | null>(null);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const segmentPath = segments.join('/');
  const isAtEntryRoute = segmentPath.length === 0 || segmentPath === 'index';
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segmentPath === '(auth)/onboarding';
  const hasValidSession = isAuthenticated && !!accessToken;
  const shouldResolveMembership =
    hasValidSession && (hasJoinedWhiteboard === null || inAuthGroup || isAtEntryRoute);
  const isAwaitingMembershipResolution =
    hasValidSession && hasJoinedWhiteboard === null && (inAuthGroup || isAtEntryRoute);

  useEffect(() => {
    setIsLayoutMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!hasValidSession) {
      setHasJoinedWhiteboard(null);
      setIsMembershipLoading(false);
      return;
    }

    if (!shouldResolveMembership) {
      setIsMembershipLoading(false);
      return;
    }

    let cancelled = false;
    const checkMembership = async () => {
      setIsMembershipLoading(true);

      try {
        const hasWhiteboards = await whiteboardService.hasAnyWhiteboard();
        if (!cancelled) {
          setHasJoinedWhiteboard(hasWhiteboards);
        }
      } catch {
        if (!cancelled) {
          // Do not block navigation if membership check fails temporarily.
          setHasJoinedWhiteboard((previousValue) => previousValue ?? true);
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
  }, [accessToken, hasValidSession, isLoading, shouldResolveMembership]);

  useEffect(() => {
    if (!isLayoutMounted || !isRouterReady || isLoading || isMembershipLoading) {
      return;
    }

    const redirectTarget = getAuthRedirectTarget({
      hasValidSession,
      hasJoinedWhiteboard,
      inAuthGroup,
      inOnboarding,
      isAtEntryRoute,
    });

    if (!redirectTarget) {
      return;
    }

    const redirectTimer = setTimeout(() => {
      router.replace(redirectTarget);
    }, 0);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [
    hasJoinedWhiteboard,
    hasValidSession,
    isAtEntryRoute,
    inAuthGroup,
    inOnboarding,
    isLayoutMounted,
    isLoading,
    isMembershipLoading,
    isRouterReady,
    router,
  ]);

  const showBlockingLoader = isLoading || isAwaitingMembershipResolution || isMembershipLoading;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
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

      {showBlockingLoader ? (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useNotifications();

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ErrorBoundary>
        <NetworkStatusBanner />
        <RootLayoutNav />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
