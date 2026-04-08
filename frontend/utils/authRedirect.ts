type AuthRedirectContext = {
  hasValidSession: boolean;
  hasJoinedWhiteboard: boolean | null;
  inAuthGroup: boolean;
  inOnboarding: boolean;
  isAtEntryRoute: boolean;
};

/**
 * Resolve the single route the app should land on once auth bootstrap is complete.
 */
export function getAuthRedirectTarget({
  hasValidSession,
  hasJoinedWhiteboard,
  inAuthGroup,
  inOnboarding,
  isAtEntryRoute,
}: AuthRedirectContext): string | null {
  if (!hasValidSession) {
    if (inAuthGroup && !inOnboarding && !isAtEntryRoute) {
      return null;
    }

    return '/(auth)/login';
  }

  if (hasJoinedWhiteboard === null && (inAuthGroup || isAtEntryRoute)) {
    return null;
  }

  if (hasJoinedWhiteboard === false) {
    if (inOnboarding) {
      return null;
    }

    return '/(auth)/onboarding';
  }

  if (inAuthGroup || isAtEntryRoute) {
    return '/(tabs)/home';
  }

  return null;
}
