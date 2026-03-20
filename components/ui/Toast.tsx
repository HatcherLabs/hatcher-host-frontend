'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const TOAST_STYLES: Record<ToastType, { border: string; icon: typeof CheckCircle; iconColor: string }> = {
  success: { border: 'border-l-green-500', icon: CheckCircle, iconColor: 'text-green-400' },
  error:   { border: 'border-l-red-500',   icon: XCircle,     iconColor: 'text-red-400' },
  info:    { border: 'border-l-purple-500', icon: Info,        iconColor: 'text-purple-400' },
  warning: { border: 'border-l-amber-500',  icon: AlertTriangle, iconColor: 'text-amber-400' },
};

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const style = TOAST_STYLES[toast.type];
  const Icon = style.icon;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [toast.id, toast.duration, onDismiss]);

  const progressColor: Record<ToastType, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-purple-500',
    warning: 'bg-amber-500',
  };

  return (
    <motion.div
      layout
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative w-[360px] rounded-xl border-l-4 ${style.border} bg-[#1A1730] p-4 shadow-lg overflow-hidden`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 flex-shrink-0 ${style.iconColor}`} />
        <p className="flex-1 text-sm text-[#F0EEFC] leading-relaxed">{toast.message}</p>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-0.5 rounded-md text-[#6B6890] hover:text-[#A5A1C2] transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <motion.div
          className={`h-full ${progressColor[toast.type]}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
