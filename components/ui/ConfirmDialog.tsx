'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) onCancel();
    },
    [open, loading, onCancel]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
      : variant === 'warning'
        ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20'
        : 'btn-primary';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={loading ? undefined : onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border p-6"
            style={{
              background: '#1A1730',
              borderColor: 'rgba(46,43,74,0.6)',
              boxShadow: '0 16px 64px rgba(0,0,0,0.4), 0 0 32px rgba(6,182,212,0.08)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#71717a] hover:text-[#fafafa] hover:bg-white/5 transition-colors disabled:opacity-40"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>

            {/* Icon */}
            {variant === 'danger' && (
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
            )}
            {variant === 'warning' && (
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-amber-400" />
              </div>
            )}

            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-[#fafafa] mb-2"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="text-sm text-[#A5A1C2] leading-relaxed mb-6"
            >
              {description}
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-medium rounded-xl text-[#A5A1C2] hover:text-[#fafafa] hover:bg-white/5 transition-all disabled:opacity-40"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                onClick={onConfirm}
                disabled={loading}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 ${confirmClasses}`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
