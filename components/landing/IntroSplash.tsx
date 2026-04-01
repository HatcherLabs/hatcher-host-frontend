'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Egg SVG with optional crack overlay ─────────────────────
function EggSVG({ cracked }: { cracked: boolean }) {
  return (
    <svg viewBox="0 0 100 130" width="120" height="156" className="overflow-visible">
      <defs>
        <linearGradient id="intro-egg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8b5cf6' }} />
          <stop offset="100%" style={{ stopColor: '#6d28d9' }} />
        </linearGradient>
        <filter id="intro-egg-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Main egg */}
      <ellipse
        cx="50"
        cy="65"
        rx="40"
        ry="55"
        fill="url(#intro-egg-grad)"
        filter="url(#intro-egg-glow)"
      />
      {/* Highlight / shine */}
      <ellipse
        cx="36"
        cy="40"
        rx="14"
        ry="22"
        fill="rgba(255,255,255,0.12)"
        transform="rotate(-20 36 40)"
      />
      <ellipse
        cx="35"
        cy="35"
        rx="6"
        ry="10"
        fill="rgba(255,255,255,0.18)"
        transform="rotate(-20 35 35)"
      />
      {/* Crack lines — appear when cracked */}
      {cracked && (
        <g>
          <path
            d="M50 10 L45 30 L55 35 L48 50 L56 52 L50 65"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M30 45 L38 50 L35 58"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M65 40 L60 48 L67 55"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      )}
    </svg>
  );
}

// ─── Robot SVG ───────────────────────────────────────────────
function RobotSVG() {
  return (
    <svg viewBox="0 0 60 60" width="72" height="72">
      {/* Head / body */}
      <rect x="10" y="15" width="40" height="35" rx="8" fill="#8b5cf6" />
      {/* Antenna */}
      <rect x="27" y="5" width="6" height="12" rx="3" fill="#06b6d4" />
      <circle cx="30" cy="4" r="3" fill="#06b6d4" opacity="0.8" />
      {/* Ears */}
      <circle cx="8" cy="32" r="5" fill="#06b6d4" />
      <circle cx="52" cy="32" r="5" fill="#06b6d4" />
      {/* Eyes - white circles with dark pupils */}
      <circle cx="22" cy="28" r="6" fill="white" />
      <circle cx="38" cy="28" r="6" fill="white" />
      <circle cx="23" cy="28" r="3" fill="var(--bg-base)" />
      <circle cx="39" cy="28" r="3" fill="var(--bg-base)" />
      {/* Eye glint */}
      <circle cx="24.5" cy="26.5" r="1.2" fill="white" opacity="0.8" />
      <circle cx="40.5" cy="26.5" r="1.2" fill="white" opacity="0.8" />
      {/* Mouth */}
      <rect x="20" y="38" width="20" height="4" rx="2" fill="#06b6d4" />
    </svg>
  );
}

// ─── Particle burst ──────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 80 + Math.random() * 50;
    const size = 4 + Math.random() * 4;
    return { angle, distance, size, color: i % 2 === 0 ? '#8b5cf6' : '#06b6d4' };
  });

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// ─── Typewriter text ─────────────────────────────────────────
function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={className}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ─── Main IntroSplash Component ──────────────────────────────
export function IntroSplash({ onComplete }: { onComplete: () => void }) {
  // 0=fade-in egg, 1=crack+shake, 2=emerge+particles, 3=text, 4=fadeout
  const [phase, setPhase] = useState(0);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),   // crack starts
      setTimeout(() => setPhase(2), 2200),   // egg breaks, robot emerges
      setTimeout(() => setPhase(3), 3200),   // text appears
      setTimeout(() => setPhase(4), 4800),   // start fade out
      setTimeout(() => handleComplete(), 5300), // done
    ];
    return () => timers.forEach(clearTimeout);
  }, [handleComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-base)]"
      animate={
        phase >= 4
          ? { opacity: 0, y: -60 }
          : { opacity: 1, y: 0 }
      }
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Radial glow background */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          scale: phase >= 2 ? [1, 1.3, 1.1] : [1, 1.05, 1],
        }}
        transition={{
          duration: phase >= 2 ? 0.6 : 2,
          ease: 'easeInOut',
          repeat: phase < 2 ? Infinity : 0,
          repeatType: 'reverse',
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Egg */}
        <AnimatePresence>
          {phase < 2 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: phase === 1 ? [0, -4, 4, -3, 3, -1, 0] : 0,
              }}
              exit={{
                scale: [1, 1.15, 0],
                opacity: [1, 0.8, 0],
              }}
              transition={{
                scale: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] },
                opacity: { duration: 0.8 },
                rotate: { duration: 0.7, ease: 'easeInOut' },
              }}
            >
              <EggSVG cracked={phase >= 1} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Particles burst from center */}
        {phase >= 2 && phase < 4 && (
          <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <Particles />
          </div>
        )}

        {/* Robot emerges */}
        {phase >= 2 && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              type: 'spring',
              bounce: 0.5,
              stiffness: 200,
            }}
          >
            <RobotSVG />
          </motion.div>
        )}

        {/* "Hatcher" typewriter text */}
        {phase >= 3 && (
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl font-bold text-white mt-5 tracking-tight"
          >
            <TypewriterText text="Hatcher" />
          </motion.h1>
        )}

        {/* Tagline */}
        {phase >= 3 && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
            className="text-sm text-purple-300/80 mt-2 tracking-wide"
          >
            AI Agent Hosting Platform
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
