import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, StyleSheet, useColorScheme } from 'react-native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { useThemeColors } from '../constants/colors';
import { ErrorBoundary, NetworkStatusBanner } from '../components';
import { useInviteLinks } from '../hooks/useInviteLinks';
import { useNotifications } from '../hooks/useNotifications';
import { whiteboardService } from '../services/whiteboardService';
import { getAuthRedirectTarget } from '../utils/authRedirect';

function RootLayoutNav() {
  const colors = useThemeColors();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
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
  const canAccessWithoutWhiteboard =
    user?.role === 'FACULTY' && segmentPath === 'whiteboard/catalog';
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
      canAccessWithoutWhiteboard,
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
    canAccessWithoutWhiteboard,
    inAuthGroup,
    inOnboarding,
    isLayoutMounted,
    isLoading,
    isMembershipLoading,
    isRouterReady,
    router,
  ]);

  const showBlockingLoader = isLoading || isAwaitingMembershipResolution || isMembershipLoading;

  // Emil-aligned screen-transition motion.
  //   PUSH_MS — forward navigation, "faster feels better" (timing-faster-better, < 300ms).
  //   SHEET_MS — drawer/sheet entrances, 500ms feels weighty (timing-drawer-500ms).
  //   FADE_MS — short fade for auth shell crossfades (under 200ms).
  // animationDuration applies on Android; iOS uses native push timing.
  const PUSH_MS = 280;
  const SHEET_MS = 480;
  const FADE_MS = 200;
  const isIPad = Platform.OS === 'ios' && Platform.isPad;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: PUSH_MS,
          gestureEnabled: true,
          fullScreenGestureEnabled: !isIPad,
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false, animation: 'fade', animationDuration: FADE_MS }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="whiteboard/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="whiteboard/settings"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="whiteboard/create"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: SHEET_MS,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="whiteboard/members"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="whiteboard/audit-log"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="whiteboard/topics"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="question/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="question/create"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: SHEET_MS,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="question/edit"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="moderation/reports"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
        />
        <Stack.Screen
          name="settings/questions"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: PUSH_MS,
          }}
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
  useInviteLinks();

  const content = (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ErrorBoundary>
        <NetworkStatusBanner />
        <RootLayoutNav />
      </ErrorBoundary>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'ios' && Platform.isPad) {
    return <GestureHandlerRootView style={styles.root}>{content}</GestureHandlerRootView>;
  }

  return content;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
