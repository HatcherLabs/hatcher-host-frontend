'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { ArrowLeft, Compass, FileCode, FolderOpen, Globe, Loader2, MonitorX, Settings, TerminalSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { WindowManagerProvider, useWindowManager, type DesktopAppRegistry } from './WindowManager';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { DesktopIcons } from './DesktopIcons';
import { FilesApp } from './apps/FilesApp';
import { EditorApp } from './apps/EditorApp';
import { TerminalApp } from './apps/TerminalApp';
import { PreviewApp } from './apps/PreviewApp';
import { BrowserApp } from './apps/BrowserApp';
import { SettingsApp } from './apps/SettingsApp';
import styles from './desktopTheme.module.css';

/** Window layer — one <Window> per open window, content from the registry. */
function DesktopWindows() {
  const { windows, apps } = useWindowManager();
  return (
    <>
      {windows.map((win) => {
        const def = apps[win.app];
        if (!def) return null;
        return (
          <Window key={win.id} window={win} icon={def.icon}>
            {def.render(win)}
          </Window>
        );
      })}
    </>
  );
}

/**
 * OS-like agent workspace desktop: icon grid + draggable windows + taskbar.
 * Desktop-viewport-oriented — small screens get a notice instead.
 */
export function DesktopShell({ agentId }: { agentId: string }) {
  const t = useTranslations('desktop');
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  // '' = failed without a server message (translated at render time so the
  // effect never depends on the translator).
  const [loadError, setLoadError] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const getSurfaceSize = useCallback(() => {
    const el = surfaceRef.current;
    return el ? { width: el.clientWidth, height: el.clientHeight } : null;
  }, []);

  // The desktop is a fixed full-viewport overlay (it covers the site nav,
  // the dashboard tab row and the cookie banner) — while it is mounted the
  // page underneath must not scroll, or wheel/touch input at the overlay
  // edges scroll-bleeds into the hidden page.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?return=${encodeURIComponent(`/dashboard/agent/${agentId}/desktop`)}`);
      return;
    }
    let cancelled = false;
    api.getAgent(agentId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setAgent(res.data);
      } else {
        setLoadError(res.error ?? '');
      }
    });
    return () => { cancelled = true; };
  }, [agentId, authLoading, isAuthenticated, router]);

  const apps = useMemo<DesktopAppRegistry>(() => {
    if (!agent) return {};
    return {
      files: {
        singleton: true,
        defaultRect: { x: 140, y: 48, w: 780, h: 560 },
        icon: <FolderOpen size={16} />,
        title: () => t('apps.files'),
        render: () => <FilesApp agent={agent} />,
      },
      editor: {
        singleton: false,
        defaultRect: { x: 220, y: 90, w: 840, h: 620 },
        icon: <FileCode size={16} />,
        title: (props) => props?.path ? props.path.split('/').pop() ?? t('apps.editor') : t('apps.editor'),
        render: (win) => <EditorApp agent={agent} windowId={win.id} path={win.props?.path} />,
      },
      terminal: {
        singleton: true,
        defaultRect: { x: 180, y: 130, w: 820, h: 520 },
        icon: <TerminalSquare size={16} />,
        title: () => t('apps.terminal'),
        render: () => <TerminalApp agent={agent} />,
      },
      preview: {
        singleton: true,
        defaultRect: { x: 260, y: 70, w: 960, h: 640 },
        icon: <Globe size={16} />,
        title: () => t('apps.preview'),
        render: () => <PreviewApp agent={agent} />,
      },
      browser: {
        singleton: false,
        defaultRect: { x: 300, y: 56, w: 980, h: 660 },
        icon: <Compass size={16} />,
        title: () => t('apps.browser'),
        render: () => <BrowserApp />,
      },
      settings: {
        singleton: true,
        defaultRect: { x: 360, y: 100, w: 600, h: 540 },
        icon: <Settings size={16} />,
        title: () => t('apps.settings'),
        // A successful save lifts the fresh agent into the shell, so the
        // taskbar chip / other windows reflect the rename immediately.
        render: () => <SettingsApp agent={agent} onAgentUpdated={setAgent} />,
      },
    };
  }, [agent, t]);

  return (
    // True fullscreen: a fixed inset-0 overlay instead of in-flow height
    // math (the old calc assumed ONE 64px nav; under the real site nav +
    // dashboard tab row the taskbar landed below the fold). z-[10000] sits
    // one step above the cookie-consent banner and GuidedTour (z-[9999]) so
    // nothing from the page chrome overlays the desktop, and below the
    // toast layer (z-[10010] in ToastProvider) so in-desktop feedback stays
    // visible. The taskbar Exit link / small-screen back link are the way
    // out — the site nav is intentionally covered.
    <div className={`fixed inset-0 z-[10000] overflow-hidden ${styles.root}`}>
      {/* Small screens: the desktop needs room — link back instead */}
      <div className="flex h-full flex-col items-center justify-center p-6 md:hidden">
        <div className={styles.dialog}>
          <h1 className={styles.dialogTitle}>
            <MonitorX size={14} aria-hidden />
            {t('smallScreen.title')}
          </h1>
          <div className={styles.dialogBody}>
            <p className={styles.dialogText}>{t('smallScreen.description')}</p>
            <Link href={`/dashboard/agent/${agentId}`} className={styles.btn}>
              <ArrowLeft size={12} aria-hidden /> {t('smallScreen.back')}
            </Link>
          </div>
        </div>
      </div>

      {/* Full desktop */}
      <div className="hidden h-full md:flex md:flex-col">
        {loadError !== null ? (
          <div className="flex h-full flex-col items-center justify-center p-6">
            <div className={styles.dialog}>
              <div className={styles.dialogBody}>
                <p className={styles.dialogText}>{loadError || t('loadFailed')}</p>
                <Link href={`/dashboard/agent/${agentId}`} className={styles.btn}>
                  <ArrowLeft size={12} aria-hidden /> {t('smallScreen.back')}
                </Link>
              </div>
            </div>
          </div>
        ) : !agent ? (
          <div className="flex h-full items-center justify-center">
            <div className={styles.dialog}>
              <div className={styles.dialogBody}>
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            </div>
          </div>
        ) : (
          <WindowManagerProvider agentId={agentId} apps={apps} getSurfaceSize={getSurfaceSize}>
            <div ref={surfaceRef} className="relative min-h-0 flex-1">
              <DesktopIcons />
              <DesktopWindows />
            </div>
            <Taskbar agent={agent} />
          </WindowManagerProvider>
        )}
      </div>
    </div>
  );
}
