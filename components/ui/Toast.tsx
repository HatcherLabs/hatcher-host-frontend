'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const TOAST_CONFIG: Record<
  ToastType,
  {
    borderColor: string;
    icon: typeof CheckCircle;
    iconColor: string;
    progressColor: string;
  }
> = {
  success: {
    borderColor: '#4ADE80',
    icon: CheckCircle,
    iconColor: 'text-[#4ADE80]',
    progressColor: '#4ADE80',
  },
  error: {
    borderColor: '#F87171',
    icon: XCircle,
    iconColor: 'text-[#F87171]',
    progressColor: '#F87171',
  },
  info: {
    borderColor: '#A78BFA',
    icon: Info,
    iconColor: 'text-[#A78BFA]',
    progressColor: '#A78BFA',
  },
  warning: {
    borderColor: '#FBBF24',
    icon: AlertTriangle,
    iconColor: 'text-[#FBBF24]',
    progressColor: '#FBBF24',
  },
};

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  // Manage the auto-dismiss timer with pause/resume support
  useEffect(() => {
    if (paused) {
      // On pause, calculate how much time is left and clear the timer
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // On resume (or initial mount), start a timeout for the remaining duration
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, remainingRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused, dismiss]);

  // Drive the progress bar width via a CSS transition for smoothness.
  // When paused we freeze at the current computed width; on resume we
  // transition the remaining distance to 0 over the remaining time.
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    if (paused) {
      // Freeze at current computed width
      const computed = bar.getBoundingClientRect().width;
      const parentWidth = bar.parentElement?.getBoundingClientRect().width ?? 1;
      const pct = (computed / parentWidth) * 100;
      bar.style.transition = 'none';
      bar.style.width = `${pct}%`;
    } else {
      // Animate from current width to 0 over the remaining time
      // Force a reflow so the browser picks up the "none" transition reset
      void bar.offsetWidth;
      bar.style.transition = `width ${remainingRef.current}ms linear`;
      bar.style.width = '0%';
    }
  }, [paused]);

  // Set the initial progress bar width on mount
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    // Start at 100% instantly, then on next frame animate to 0
    bar.style.width = '100%';
    bar.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = `width ${toast.duration}ms linear`;
        bar.style.width = '0%';
      });
    });
  }, [toast.duration]);

  return (
    <motion.div
      layout
      initial={{ x: 400, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-[380px] overflow-hidden rounded-xl border border-white/[0.06] bg-[#1A1730]/90 shadow-lg backdrop-blur-xl"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
      role="alert"
    >
      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        <Icon
          size={20}
          className={`mt-0.5 flex-shrink-0 ${config.iconColor}`}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#F0EEFC]">
          {toast.message}
        </p>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-lg p-1 text-[#6B6890] transition-colors hover:bg-white/[0.06] hover:text-[#A5A1C2]"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.04]">
        <div
          ref={progressRef}
          className="h-full"
          style={{
            backgroundColor: config.progressColor,
            opacity: 0.7,
            width: '100%',
          }}
        />
      </div>
    </motion.div>
  );
}
