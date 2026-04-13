'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GuidedTourProps {
  steps: TourStep[];
  storageKey?: string;
  onComplete?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

export function GuidedTour({
  steps,
  storageKey = 'hatcher_tour_complete',
  onComplete,
}: GuidedTourProps) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const rafRef = useRef(0);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(storageKey) === 'true') return;
    // Small delay so DOM elements render first
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  // Measure target element and keep it in sync on scroll/resize
  const measure = useCallback(() => {
    if (!visible || current >= steps.length) return;
    const el = document.querySelector(steps[current].target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    });
  }, [visible, current, steps]);

  useEffect(() => {
    if (!visible) return;
    measure();
    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);
    return () => {
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, measure]);

  // Scroll target into view
  useEffect(() => {
    if (!visible || current >= steps.length) return;
    const el = document.querySelector(steps[current].target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [visible, current, steps]);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem(storageKey, 'true');
    onComplete?.();
  }, [storageKey, onComplete]);

  const next = useCallback(() => {
    if (current + 1 >= steps.length) {
      finish();
    } else {
      setCurrent((c) => c + 1);
    }
  }, [current, steps.length, finish]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft' && current > 0) setCurrent((c) => c - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, finish, next, current]);

  if (!visible || !targetRect) return null;

  const step = steps[current];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const pos = isMobile ? 'bottom' : (step.position ?? 'bottom');

  // Tooltip positioning
  const tooltip = { top: 0, left: 0 };
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  const viewTop = targetRect.top - scrollY;

  if (pos === 'bottom') {
    tooltip.top = viewTop + targetRect.height + PAD + 12;
    tooltip.left = targetRect.left + targetRect.width / 2;
  } else if (pos === 'top') {
    tooltip.top = viewTop - PAD - 12;
    tooltip.left = targetRect.left + targetRect.width / 2;
  } else if (pos === 'left') {
    tooltip.top = viewTop + targetRect.height / 2;
    tooltip.left = targetRect.left - PAD - 12;
  } else {
    tooltip.top = viewTop + targetRect.height / 2;
    tooltip.left = targetRect.left + targetRect.width + PAD + 12;
  }

  // Spotlight clip path (rectangle cutout)
  const sTop = viewTop - PAD;
  const sLeft = targetRect.left - PAD;
  const sW = targetRect.width + PAD * 2;
  const sH = targetRect.height + PAD * 2;
  const r = 12;
  const clip = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${sLeft}px ${sTop + r}px,
    ${sLeft + r}px ${sTop}px,
    ${sLeft + sW - r}px ${sTop}px,
    ${sLeft + sW}px ${sTop + r}px,
    ${sLeft + sW}px ${sTop + sH - r}px,
    ${sLeft + sW - r}px ${sTop + sH}px,
    ${sLeft + r}px ${sTop + sH}px,
    ${sLeft}px ${sTop + sH - r}px,
    ${sLeft}px ${sTop + r}px
  )`;

  const transformOrigin =
    pos === 'top' ? 'bottom center' :
    pos === 'left' ? 'center right' :
    pos === 'right' ? 'center left' :
    'top center';

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        style={{
          background: 'rgba(0,0,0,0.65)',
          clipPath: clip,
        }}
        onClick={finish}
      />

      {/* Spotlight ring */}
      <div
        className="fixed z-[9998] pointer-events-none rounded-xl"
        style={{
          top: sTop,
          left: sLeft,
          width: sW,
          height: sH,
          boxShadow: '0 0 0 2px var(--color-accent), 0 0 24px 4px rgba(139,92,246,0.25)',
        }}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 0.9, y: pos === 'top' ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed z-[9999] w-72 sm:w-80"
          style={{
            top: tooltip.top,
            left: tooltip.left,
            transform:
              pos === 'bottom' ? 'translateX(-50%)' :
              pos === 'top' ? 'translateX(-50%) translateY(-100%)' :
              pos === 'left' ? 'translateX(-100%) translateY(-50%)' :
              'translateY(-50%)',
            transformOrigin,
          }}
        >
          <div
            className="rounded-2xl border border-white/10 p-5 shadow-2xl"
            style={{
              background: 'rgba(var(--bg-card-rgb, 30,30,40), 0.85)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
            }}
          >
            {/* Step counter */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[var(--color-accent)] tracking-wide uppercase">
                Step {current + 1} of {steps.length}
              </span>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full transition-colors duration-300"
                    style={{
                      background: i <= current ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">
              {step.title}
            </h3>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)] mb-4">
              {step.description}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={finish}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Skip tour
              </button>
              <button
                onClick={next}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent), #06b6d4)',
                }}
              >
                {current + 1 >= steps.length ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
