/**
 * Capacitor native integration helpers.
 * Only active when running inside a Capacitor native shell.
 */

export const isNative = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor;

export async function initCapacitor() {
  if (!isNative) return;

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });

    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    const { App } = await import('@capacitor/app');
    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Handle deep links
    App.addListener('appUrlOpen', ({ url }) => {
      const path = new URL(url).pathname;
      if (path) {
        window.location.href = path;
      }
    });

    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {
    // Capacitor plugins not available — running in browser
  }
}
