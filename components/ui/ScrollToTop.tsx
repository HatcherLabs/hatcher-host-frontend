'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-4 sm:bottom-20 sm:right-6 z-50 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[var(--bg-elevated)]/80 backdrop-blur-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 shadow-lg cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
