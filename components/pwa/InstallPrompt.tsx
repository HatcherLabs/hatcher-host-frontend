'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          <img src="/icon.svg" alt="Hatcher" className="h-10 w-10 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100">Install Hatcher</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Add Hatcher to your home screen for quick access to your AI agents.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
