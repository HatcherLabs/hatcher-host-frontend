/**
 * Capacitor native integration helpers.
 * Only active when running inside a Capacitor native shell.
 */

export const isNative = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.hatcher.host';

export async function initCapacitor() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
    await StatusBar.setStyle({ style: Style.Dark });

    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    const { App } = await import('@capacitor/app');
    // Handle back button on Android — navigate history before exiting
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Handle deep links (hatcher.host/*, hatcher://app/*)
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname + parsed.search;
        if (path && path !== '/') {
          window.location.href = path;
        }
      } catch {
        // Invalid URL — ignore
      }
    });

    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });

    // Initialize push notifications
    await initPushNotifications();
  } catch {
    // Capacitor plugins not available — running in browser
  }
}

/**
 * Register for push notifications and send token to backend.
 */
async function initPushNotifications() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async ({ value: token }) => {
      // Send FCM token to backend
      const jwt = getStoredToken();
      if (!jwt) return;

      try {
        await fetch(`${API_URL}/auth/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ token, platform: 'android' }),
        });
      } catch {
        // Will retry on next app open
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.warn('Push registration failed:', error);
    });

    // Handle notification tap — navigate to relevant screen
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const data = notification.data as Record<string, string> | undefined;
      if (data?.path) {
        window.location.href = data.path;
      } else if (data?.agentId) {
        window.location.href = `/dashboard/agents/${data.agentId}`;
      }
    });
  } catch {
    // Push notifications not available (no google-services.json or browser)
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('hatcher_jwt');
  } catch {
    return null;
  }
}

/**
 * Trigger haptic feedback. No-op in browser.
 */
export async function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {
    // Not available
  }
}

/**
 * Trigger success/warning/error notification haptic.
 */
export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    await Haptics.notification({ type: map[type] });
  } catch {
    // Not available
  }
}
