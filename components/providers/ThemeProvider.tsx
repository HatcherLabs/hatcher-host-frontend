'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

// v3: light theme removed. forcedTheme="dark" overrides any stored
// preference from v1/v2 so users coming back after a light-mode session
// land on dark immediately. The toggle UI is also removed from Header.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
