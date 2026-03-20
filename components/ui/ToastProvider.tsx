'use client';

import { createContext, useCallback, useContext, useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, type ToastData, type ToastType } from './Toast';

const MAX_VISIBLE = 3;

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const queueRef = useRef<ToastData[]>([]);
  const counterRef = useRef(0);

  const promoteFromQueue = useCallback(() => {
    if (queueRef.current.length === 0) return;
    setToasts((prev) => {
      const slots = MAX_VISIBLE - prev.length;
      if (slots <= 0) return prev;
      const promoted = queueRef.current.splice(0, slots);
      return [...prev, ...promoted];
    });
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      // Use setTimeout so state update settles before promoting
      setTimeout(promoteFromQueue, 50);
    },
    [promoteFromQueue],
  );

  const toast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      const id = `toast-${++counterRef.current}-${Date.now()}`;
      const newToast: ToastData = { id, type, message, duration };

      setToasts((prev) => {
        if (prev.length >= MAX_VISIBLE) {
          queueRef.current.push(newToast);
          return prev;
        }
        return [...prev, newToast];
      });
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
