'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutHelpModal({ isOpen, onClose }: ShortcutHelpModalProps) {
  if (!isOpen) return null;

  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm mx-4 rounded-2xl border border-white/[0.08] bg-[#18181b] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Keyboard size={18} className="text-purple-400" />
              <h3 className="text-base font-semibold text-white">Keyboard Shortcuts</h3>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {categories.map((category) => (
              <div key={category}>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{category}</p>
                <div className="space-y-1.5">
                  {SHORTCUTS.filter((s) => s.category === category).map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">{shortcut.label}</span>
                      <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-white/[0.08] text-xs text-zinc-400 font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-zinc-500 text-center">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/[0.08] text-zinc-400 font-mono">?</kbd> anytime to toggle
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
