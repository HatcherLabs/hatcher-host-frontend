'use client';

import { createContext, useCallback, useContext, useState, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, type ToastData, type ToastType } from './Toast';

const MAX_VISIBLE = 3;

/** Base callable signature: toast('success', 'message') */
type ToastFn = (type: ToastType, message: string, duration?: number) => void;

/** Convenience methods: toast.success('message') */
interface ToastMethods {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

/** Combined type — callable with shorthand methods attached */
export type ToastAPI = ToastFn & ToastMethods;

interface ToastContextValue {
  toast: ToastAPI;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access the toast notification system.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Saved!');
 *   toast.error('Something went wrong');
 *   toast('info', 'FYI...');
 */
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
      // Allow state to settle before promoting queued toasts
      setTimeout(promoteFromQueue, 50);
    },
    [promoteFromQueue],
  );

  const addToast = useCallback(
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

  // Build the combined toast API: callable function + convenience methods
  const toast = useMemo<ToastAPI>(() => {
    const fn = ((type: ToastType, message: string, duration?: number) => {
      addToast(type, message, duration);
    }) as ToastAPI;

    fn.success = (message: string, duration?: number) => addToast('success', message, duration);
    fn.error = (message: string, duration?: number) => addToast('error', message, duration);
    fn.info = (message: string, duration?: number) => addToast('info', message, duration);
    fn.warning = (message: string, duration?: number) => addToast('warning', message, duration);

    return fn;
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container -- fixed top-center */}
      <div
        className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center w-full max-w-md px-4"
        role="status"
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
