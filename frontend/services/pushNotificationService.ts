import { Platform } from 'react-native';
import * as Constants from 'expo-constants';

let notificationsModule: typeof import('expo-notifications') | null = null;
let isNotificationHandlerConfigured = false;
let expoGoRegistrationWarned = false;

export function getNativeNotificationsModule(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!notificationsModule) {
    notificationsModule = require('expo-notifications') as typeof import('expo-notifications');
  }

  if (!isNotificationHandlerConfigured) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isNotificationHandlerConfigured = true;
  }

  return notificationsModule;
}

export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = getNativeNotificationsModule();
  if (!Notifications) {
    return null;
  }

  if (Constants.default.appOwnership === 'expo') {
    if (!expoGoRegistrationWarned) {
      console.warn(
        '[Notifications] Expo Go detected. Remote push notifications require a development build.'
      );
      expoGoRegistrationWarned = true;
    }
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    const projectId =
      Constants.default.expoConfig?.extra?.eas?.projectId ?? Constants.default.easConfig?.projectId;

    if (!projectId) {
      console.warn('[Notifications] No project ID found for push token registration');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Ghost Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#BB2744',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.warn('[Notifications] Failed to register:', error);
    return null;
  }
}
