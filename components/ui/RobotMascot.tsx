'use client';

import { motion } from 'framer-motion';

interface RobotMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: 'happy' | 'thinking' | 'confused' | 'waving';
  className?: string;
  animate?: boolean;
}

const SIZES = {
  sm: { w: 48, h: 48 },
  md: { w: 80, h: 80 },
  lg: { w: 120, h: 120 },
  xl: { w: 160, h: 160 },
};

export function RobotMascot({ size = 'md', mood = 'happy', className = '', animate = true }: RobotMascotProps) {
  const { w, h } = SIZES[size];
  const scale = w / 80; // base scale factor

  const eyeVariants = {
    happy: { scaleY: 1 },
    thinking: { scaleY: 0.6 },
    confused: { scaleY: 1.2 },
    waving: { scaleY: 1 },
  };

  const bodyVariants = animate
    ? {
        animate: {
          y: [0, -4 * scale, 0],
          rotate: mood === 'waving' ? [0, -2, 2, 0] : [0, -1, 1, 0],
        },
        transition: {
          duration: mood === 'waving' ? 2 : 3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      }
    : {};

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: w, height: h }}
      animate={bodyVariants.animate}
      transition={bodyVariants.transition}
    >
      <svg
        viewBox="0 0 80 80"
        width={w}
        height={h}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow effect under robot */}
        <ellipse cx="40" cy="74" rx="20" ry="4" fill="url(#shadowGrad)" />

        {/* Antenna */}
        <line x1="40" y1="12" x2="40" y2="4" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="40" cy="3" r="3" fill="#06b6d4">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="3" r="3" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3">
          <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Head */}
        <rect x="18" y="12" width="44" height="32" rx="10" fill="url(#headGrad)" stroke="#06b6d4" strokeWidth="1" opacity="0.9" />

        {/* Visor / face plate */}
        <rect x="24" y="18" width="32" height="18" rx="6" fill="#0D0B1A" opacity="0.7" />

        {/* Eyes */}
        <motion.ellipse
          cx="33" cy="27" rx="4" ry="4"
          fill="#06b6d4"
          animate={eyeVariants[mood]}
          transition={{ duration: 0.3 }}
        >
          <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite" />
        </motion.ellipse>
        <motion.ellipse
          cx="47" cy="27" rx="4" ry="4"
          fill="#06b6d4"
          animate={eyeVariants[mood]}
          transition={{ duration: 0.3 }}
        >
          <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite" />
        </motion.ellipse>

        {/* Eye highlights */}
        <circle cx="31" cy="25" r="1.5" fill="#06b6d4" opacity="0.8" />
        <circle cx="45" cy="25" r="1.5" fill="#06b6d4" opacity="0.8" />

        {/* Mouth */}
        {mood === 'happy' && (
          <path d="M34 32 Q40 36 46 32" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}
        {mood === 'thinking' && (
          <line x1="36" y1="33" x2="44" y2="33" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
        )}
        {mood === 'confused' && (
          <path d="M34 34 Q37 31 40 34 Q43 37 46 34" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}
        {mood === 'waving' && (
          <path d="M34 32 Q40 37 46 32" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}

        {/* Neck */}
        <rect x="36" y="44" width="8" height="4" rx="2" fill="#2E2B4A" />

        {/* Body */}
        <rect x="22" y="48" width="36" height="20" rx="8" fill="url(#bodyGrad)" stroke="#06b6d4" strokeWidth="0.8" opacity="0.8" />

        {/* Chest light */}
        <circle cx="40" cy="56" r="3" fill="#06b6d4" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="56" r="1.5" fill="#06b6d4" />

        {/* Chest panel lines */}
        <line x1="30" y1="53" x2="34" y2="53" stroke="#71717a" strokeWidth="0.5" opacity="0.4" />
        <line x1="46" y1="53" x2="50" y2="53" stroke="#71717a" strokeWidth="0.5" opacity="0.4" />
        <line x1="30" y1="60" x2="34" y2="60" stroke="#71717a" strokeWidth="0.5" opacity="0.4" />
        <line x1="46" y1="60" x2="50" y2="60" stroke="#71717a" strokeWidth="0.5" opacity="0.4" />

        {/* Arms */}
        {mood === 'waving' ? (
          <>
            {/* Left arm normal */}
            <rect x="12" y="50" width="8" height="14" rx="4" fill="url(#armGrad)" stroke="#06b6d4" strokeWidth="0.5" opacity="0.7" />
            {/* Right arm waving */}
            <motion.g
              animate={{ rotate: [-10, 20, -10] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '64px 50px' }}
            >
              <rect x="60" y="44" width="8" height="14" rx="4" fill="url(#armGrad)" stroke="#06b6d4" strokeWidth="0.5" opacity="0.7" />
            </motion.g>
          </>
        ) : (
          <>
            <rect x="12" y="50" width="8" height="14" rx="4" fill="url(#armGrad)" stroke="#06b6d4" strokeWidth="0.5" opacity="0.7" />
            <rect x="60" y="50" width="8" height="14" rx="4" fill="url(#armGrad)" stroke="#06b6d4" strokeWidth="0.5" opacity="0.7" />
          </>
        )}

        {/* Legs */}
        <rect x="30" y="68" width="8" height="6" rx="3" fill="#2E2B4A" stroke="#06b6d4" strokeWidth="0.5" opacity="0.6" />
        <rect x="42" y="68" width="8" height="6" rx="3" fill="#2E2B4A" stroke="#06b6d4" strokeWidth="0.5" opacity="0.6" />

        {/* Gradients */}
        <defs>
          <linearGradient id="headGrad" x1="18" y1="12" x2="62" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1A1730" />
            <stop offset="100%" stopColor="#252240" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="22" y1="48" x2="58" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1A1730" />
            <stop offset="100%" stopColor="#252240" />
          </linearGradient>
          <linearGradient id="armGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1730" />
            <stop offset="100%" stopColor="#2E2B4A" />
          </linearGradient>
          <radialGradient id="shadowGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  );
}
