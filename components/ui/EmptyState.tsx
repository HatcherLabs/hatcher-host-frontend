'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Icon with glowing circle */}
      <motion.div
        className="relative mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Outer glow pulse */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
            transform: 'scale(1.8)',
          }}
        />
        {/* Icon circle */}
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.2)',
            boxShadow: '0 0 24px rgba(6,182,212,0.15), 0 0 48px rgba(6,182,212,0.05)',
          }}
        >
          <Icon size={36} style={{ color: '#06b6d4' }} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        className="text-xl font-semibold mb-2"
        style={{
          color: '#F0EEFC',
          fontFamily: 'var(--font-display), system-ui, sans-serif',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {title}
      </motion.h2>

      {/* Description */}
      <motion.p
        className="text-sm max-w-sm mb-8"
        style={{ color: '#A5A1C2' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {description}
      </motion.p>

      {/* Action buttons */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: '#06b6d4',
            boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
          }}
        >
          {actionLabel}
        </Link>

        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80 border"
            style={{
              color: '#A5A1C2',
              borderColor: 'rgba(46,43,74,0.6)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {secondaryLabel}
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
}
