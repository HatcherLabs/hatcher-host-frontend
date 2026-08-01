'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
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
const GAP = 12;
const MARGIN = 12;
/** Fallback card height for the first frame, replaced by the measured height. */
const EST_CARD_H = 220;
const CARD_W = 320;
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

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

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
  const [cardH, setCardH] = useState(EST_CARD_H);
  const rafRef = useRef(0);
  const startedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
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

  // Measure target element (viewport coordinates — everything we render is
  // position:fixed) and keep it in sync on scroll/resize. If the current
  // target vanished, skip ahead; if nothing resolves, hide WITHOUT persisting
  // completion so the tour can run on the next visit.
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
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
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

  // The card's real height feeds the flip/clamp math; the estimate only
  // covers the first animation frame.
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 1) setCardH(h);
  }, [current, targetRect, isMobile, cardH]);

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
  const isLast = findResolvableStep(steps, current + 1, 1, canResolve) === -1;

  // Step counter only counts steps that can actually run on this page;
  // unresolvable ones are silently skipped and must not inflate the total.
  const resolvableIdxs: number[] = [];
  for (let i = 0; i < steps.length; i++) {
    if (i === current || canResolve(steps[i].target)) resolvableIdxs.push(i);
  }
  const stepNumber = resolvableIdxs.indexOf(current) + 1;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Spotlight rect
  const sTop = targetRect.top - PAD;
  const sLeft = targetRect.left - PAD;
  const sW = targetRect.width + PAD * 2;
  const sH = targetRect.height + PAD * 2;

  // Desktop tooltip placement: pick a side with room (flip when the preferred
  // one has none), then clamp the card fully inside the viewport. Corner-based
  // coordinates only — a static `transform` in style would be overwritten by
  // framer-motion's animated transform.
  let cardStyle: React.CSSProperties;
  if (isMobile) {
    // Phones get a bottom sheet: no anchor math, always reachable, above the
    // home-indicator via safe-area.
    cardStyle = {
      left: MARGIN,
      right: MARGIN,
      bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MARGIN}px)`,
    };
  } else {
    const spaceAbove = sTop - GAP;
    const spaceBelow = vh - (sTop + sH) - GAP;
    const centerX = targetRect.left + targetRect.width / 2;

    let pos: 'top' | 'bottom' | 'left' | 'right' | 'center' = step.position ?? 'bottom';
    if (pos === 'left' && sLeft - GAP < CARD_W + MARGIN) pos = 'bottom';
    if (pos === 'right' && vw - (sLeft + sW) - GAP < CARD_W + MARGIN) pos = 'bottom';
    if (pos === 'bottom' && spaceBelow < cardH + MARGIN && spaceAbove > spaceBelow) pos = 'top';
    else if (pos === 'top' && spaceAbove < cardH + MARGIN && spaceBelow >= spaceAbove) pos = 'bottom';
    // Full-viewport targets (e.g. the chat root) leave no room on any side.
    if (sW > vw * 0.85 && sH > vh * 0.7) pos = 'center';

    let top: number;
    let left: number;
    if (pos === 'top') {
      top = sTop - GAP - cardH;
      left = centerX - CARD_W / 2;
    } else if (pos === 'left') {
      top = sTop + sH / 2 - cardH / 2;
      left = sLeft - GAP - CARD_W;
    } else if (pos === 'right') {
      top = sTop + sH / 2 - cardH / 2;
      left = sLeft + sW + GAP;
    } else if (pos === 'center') {
      top = (vh - cardH) / 2;
      left = (vw - CARD_W) / 2;
    } else {
      top = sTop + sH + GAP;
      left = centerX - CARD_W / 2;
    }
    cardStyle = {
      top: clamp(top, MARGIN, vh - cardH - MARGIN),
      left: clamp(left, MARGIN, vw - CARD_W - MARGIN),
      width: CARD_W,
    };
  }

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
          initial={{ opacity: 0, scale: 0.96, y: isMobile ? 16 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed z-[9999]"
          style={cardStyle}
        >
          <div
            ref={cardRef}
            className="relative rounded-2xl border p-5 shadow-2xl"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <button
              onClick={() => finish('skip')}
              aria-label={t('skip')}
              className="absolute top-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors cursor-pointer hover:text-[var(--text-primary)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Step counter */}
            <div className="flex items-center justify-between gap-3 mb-3 pr-9">
              <span className="text-[11px] font-semibold text-[var(--accent)] tracking-wide uppercase">
                {t('stepCounter', { current: stepNumber, total: resolvableIdxs.length })}
              </span>
              <div className="flex gap-1">
                {resolvableIdxs.map((idx) => (
                  <span
                    key={idx}
                    className="block w-1.5 h-1.5 rounded-full transition-colors duration-300"
                    style={{
                      background: idx <= current ? 'var(--accent)' : 'var(--border-default)',
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
                className="px-2 py-2 -mx-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                {t('skip')}
              </button>
              <div className="flex items-center gap-2">
                {current > 0 && (
                  <button
                    onClick={back}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors cursor-pointer hover:text-[var(--text-primary)]"
                  >
                    {t('back')}
                  </button>
                )}
                <button
                  onClick={next}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer hover:brightness-110"
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
