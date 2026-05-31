'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, type ToastData, type ToastType } from './Toast';

const MAX_VISIBLE = 3;

let toastSequence = 0;

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

interface ToastState {
  visible: ToastData[];
  queue: ToastData[];
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
  const [toastState, setToastState] = useState<ToastState>({
    visible: [],
    queue: [],
  });

  const dismiss = useCallback((id: string) => {
    setToastState((prev) => {
      const visible = prev.visible.filter((toast) => toast.id !== id);
      if (visible.length === prev.visible.length) return prev;
      const slots = MAX_VISIBLE - visible.length;
      if (slots <= 0 || prev.queue.length === 0) return { ...prev, visible };
      return {
        visible: [...visible, ...prev.queue.slice(0, slots)],
        queue: prev.queue.slice(slots),
      };
    });
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      toastSequence += 1;
      const id = `toast-${Date.now().toString(36)}-${toastSequence.toString(36)}`;
      const newToast: ToastData = { id, type, message, duration };

      setToastState((prev) =>
        prev.visible.length >= MAX_VISIBLE
          ? { ...prev, queue: [...prev.queue, newToast] }
          : { ...prev, visible: [...prev.visible, newToast] },
      );
    },
    [],
  );

  // Build the combined toast API: callable function + convenience methods
  const toast = useMemo<ToastAPI>(() => {
    const fn = ((type: ToastType, message: string, duration?: number) => {
      addToast(type, message, duration);
    }) as ToastAPI;

    fn.success = (message: string, duration?: number) =>
      addToast('success', message, duration);
    fn.error = (message: string, duration?: number) =>
      addToast('error', message, duration);
    fn.info = (message: string, duration?: number) =>
      addToast('info', message, duration);
    fn.warning = (message: string, duration?: number) =>
      addToast('warning', message, duration);

    return fn;
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container -- fixed top-center */}
      <div
        className="pointer-events-none fixed top-20 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-md -translate-x-1/2 flex-col items-center gap-3 sm:px-4"
        role="status"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toastState.visible.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
