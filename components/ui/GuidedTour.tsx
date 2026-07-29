'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { findResolvableStep } from './guidedTourSteps';

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
  onSkip?: () => void;
  onStart?: () => void;
  /** When provided, the tour is controlled: true runs it regardless of the storage flag. */
  open?: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const TARGET_WAIT_TIMEOUT = 10_000;

/**
 * Resolve a target selector to the first VISIBLE match. Responsive layouts
 * render some anchors twice (a mobile and a desktop variant, one of them
 * display:none), and a plain querySelector could hand back the hidden copy.
 */
function resolveTarget(target: string): Element | null {
  try {
    const matches = document.querySelectorAll(target);
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].getClientRects().length > 0) return matches[i];
    }
  } catch {
    // invalid selector
  }
  return null;
}

function canResolve(target: string): boolean {
  return !!resolveTarget(target);
}

export function GuidedTour({
  steps,
  storageKey = 'hatcher_tour_complete',
  onComplete,
  onSkip,
  onStart,
  open,
}: GuidedTourProps) {
  const t = useTranslations('guidedTour');
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef(0);
  const startedRef = useRef(false);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  const controlled = open !== undefined;

  // Wait for the first resolvable target before starting; a fixed timer would
  // often fire while the page is still showing loading skeletons.
  const startWhenTargetAvailable = useCallback(() => {
    const tryStart = () => {
      const idx = findResolvableStep(steps, 0, 1, canResolve);
      if (idx === -1) return false;
      setCurrent(idx);
      setVisible(true);
      if (!startedRef.current) {
        startedRef.current = true;
        onStartRef.current?.();
      }
      return true;
    };
    if (tryStart()) return () => {};
    const observer = new MutationObserver(() => {
      if (tryStart()) {
        observer.disconnect();
        clearTimeout(timer);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => observer.disconnect(), TARGET_WAIT_TIMEOUT);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [steps]);

  // Self-start on first run (uncontrolled) unless already completed
  useEffect(() => {
    if (controlled) return;
    if (localStorage.getItem(storageKey) === 'true') return;
    return startWhenTargetAvailable();
  }, [controlled, storageKey, startWhenTargetAvailable]);

  // Controlled mode: run whenever `open` is true, regardless of the flag
  useEffect(() => {
    if (!controlled) return;
    if (!open) {
      setVisible(false);
      return;
    }
    return startWhenTargetAvailable();
  }, [controlled, open, startWhenTargetAvailable]);

  // Track viewport size without touching window during render
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Measure target element and keep it in sync on scroll/resize.
  // If the current target vanished, skip ahead; if nothing resolves, hide
  // WITHOUT persisting completion so the tour can run on the next visit.
  const measure = useCallback(() => {
    if (!visible || current >= steps.length) return;
    const el = resolveTarget(steps[current].target);
    if (!el) {
      const idx = findResolvableStep(steps, current + 1, 1, canResolve);
      if (idx !== -1) {
        setCurrent(idx);
      } else {
        setVisible(false);
        setTargetRect(null);
      }
      return;
    }
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
    const el = resolveTarget(steps[current].target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [visible, current, steps]);

  const finish = useCallback((reason: 'complete' | 'skip') => {
    setVisible(false);
    localStorage.setItem(storageKey, 'true');
    if (reason === 'skip') onSkip?.();
    else onComplete?.();
  }, [storageKey, onComplete, onSkip]);

  const next = useCallback(() => {
    const idx = findResolvableStep(steps, current + 1, 1, canResolve);
    if (idx === -1) finish('complete');
    else setCurrent(idx);
  }, [current, steps, finish]);

  const back = useCallback(() => {
    const idx = findResolvableStep(steps, current - 1, -1, canResolve);
    if (idx !== -1) setCurrent(idx);
  }, [current, steps]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish('skip');
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, finish, next, back]);

  if (!visible || !targetRect) return null;

  const step = steps[current];
  const pos = isMobile ? 'bottom' : (step.position ?? 'bottom');
  const isLast = findResolvableStep(steps, current + 1, 1, canResolve) === -1;

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

  // Spotlight rect
  const sTop = viewTop - PAD;
  const sLeft = targetRect.left - PAD;
  const sW = targetRect.width + PAD * 2;
  const sH = targetRect.height + PAD * 2;

  const transformOrigin =
    pos === 'top' ? 'bottom center' :
    pos === 'left' ? 'center right' :
    pos === 'right' ? 'center left' :
    'top center';

  return (
    <>
      {/* Click shield: swallows stray backdrop clicks without ending the tour */}
      <div className="fixed inset-0 z-[9997]" aria-hidden />

      {/* Spotlight: the giant box-shadow dims everything around the target */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed z-[9998] pointer-events-none rounded-xl"
        style={{
          top: sTop,
          left: sLeft,
          width: sW,
          height: sH,
          boxShadow: '0 0 0 2px var(--accent), 0 0 0 9999px rgba(0,0,0,0.65)',
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
            className="rounded-2xl border p-5 shadow-2xl"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            {/* Step counter */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[var(--accent)] tracking-wide uppercase">
                {t('stepCounter', { current: current + 1, total: steps.length })}
              </span>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full transition-colors duration-300"
                    style={{
                      background: i <= current ? 'var(--accent)' : 'var(--border-default)',
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

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => finish('skip')}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                {t('skip')}
              </button>
              <div className="flex items-center gap-2">
                {current > 0 && (
                  <button
                    onClick={back}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors cursor-pointer hover:text-[var(--text-primary)]"
                  >
                    {t('back')}
                  </button>
                )}
                <button
                  onClick={next}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer hover:brightness-110"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg-base)',
                  }}
                >
                  {isLast ? t('done') : t('next')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
