'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Square } from 'lucide-react';
import { SoundWaveBars, RecordingDot } from './SoundWaveBars';

interface VoiceControlBarProps {
  isListening: boolean;
  isSpeaking: boolean;
  onStop: () => void;
}

export function VoiceControlBar({ isListening, isSpeaking, onStop }: VoiceControlBarProps) {
  return (
    <AnimatePresence>
      {(isListening || isSpeaking) && (
        <motion.div
          initial={{ opacity: 0, y: 4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 4, height: 0 }}
          className="mb-2"
        >
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs">
              {isListening && (
                <>
                  <RecordingDot />
                  <span className="text-red-400">Listening...</span>
                </>
              )}
              {isSpeaking && (
                <>
                  <SoundWaveBars />
                  <span className="text-[var(--color-accent)]">Speaking...</span>
                </>
              )}
            </div>
            <button
              onClick={onStop}
              className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Stop"
            >
              <Square size={12} fill="currentColor" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
