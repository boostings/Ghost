import { getAuthRedirectTarget } from './authRedirect';

describe('getAuthRedirectTarget', () => {
  it('regression 90ca885 sends entry launches with a valid session straight to home', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: true,
        hasJoinedWhiteboard: true,
        inAuthGroup: false,
        inOnboarding: false,
        isAtEntryRoute: true,
      })
    ).toBe('/(tabs)/home');
  });

  it('sends authenticated users without a whiteboard to onboarding', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: true,
        hasJoinedWhiteboard: false,
        inAuthGroup: false,
        inOnboarding: false,
        isAtEntryRoute: true,
      })
    ).toBe('/(auth)/onboarding');
  });

  it('waits for membership resolution before routing an authenticated entry launch', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: true,
        hasJoinedWhiteboard: null,
        inAuthGroup: false,
        inOnboarding: false,
        isAtEntryRoute: true,
      })
    ).toBeNull();
  });

  it('keeps unauthenticated users on public auth routes', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: false,
        hasJoinedWhiteboard: null,
        inAuthGroup: true,
        inOnboarding: false,
        isAtEntryRoute: false,
      })
    ).toBeNull();
  });

  it('redirects unauthenticated entry launches to login', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: false,
        hasJoinedWhiteboard: null,
        inAuthGroup: false,
        inOnboarding: false,
        isAtEntryRoute: true,
      })
    ).toBe('/(auth)/login');
  });

  it('keeps authenticated onboarding users without memberships on onboarding', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: true,
        hasJoinedWhiteboard: false,
        inAuthGroup: true,
        inOnboarding: true,
        isAtEntryRoute: false,
      })
    ).toBeNull();
  });

  it('lets authenticated users without memberships reach explicitly allowed setup routes', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: true,
        hasJoinedWhiteboard: false,
        inAuthGroup: false,
        inOnboarding: false,
        isAtEntryRoute: false,
        canAccessWithoutWhiteboard: true,
      })
    ).toBeNull();
  });

  it('keeps authenticated users on their current non-auth route when no redirect is needed', () => {
    expect(
      getAuthRedirectTarget({
        hasValidSession: true,
        hasJoinedWhiteboard: true,
        inAuthGroup: false,
        inOnboarding: false,
        isAtEntryRoute: false,
      })
    ).toBeNull();
  });

  it.each([
    {
      hasValidSession: false,
      hasJoinedWhiteboard: null,
      inAuthGroup: true,
      inOnboarding: true,
      isAtEntryRoute: false,
      expected: '/(auth)/login',
    },
    {
      hasValidSession: false,
      hasJoinedWhiteboard: null,
      inAuthGroup: false,
      inOnboarding: false,
      isAtEntryRoute: false,
      expected: '/(auth)/login',
    },
    {
      hasValidSession: true,
      hasJoinedWhiteboard: null,
      inAuthGroup: true,
      inOnboarding: false,
      isAtEntryRoute: false,
      expected: null,
    },
    {
      hasValidSession: true,
      hasJoinedWhiteboard: false,
      inAuthGroup: false,
      inOnboarding: false,
      isAtEntryRoute: false,
      expected: '/(auth)/onboarding',
    },
    {
      hasValidSession: true,
      hasJoinedWhiteboard: true,
      inAuthGroup: true,
      inOnboarding: false,
      isAtEntryRoute: false,
      expected: '/(tabs)/home',
    },
  ])('pairwise routing matrix %# resolves to $expected', ({ expected, ...input }) => {
    expect(getAuthRedirectTarget(input)).toBe(expected);
  });
});
