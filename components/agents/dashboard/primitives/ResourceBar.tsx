'use client';

import { motion } from 'framer-motion';

/**
 * A single horizontal resource usage bar with a label, current value, max,
 * and an animated fill. Used in HealthPerformanceCard for CPU / memory.
 *
 * The bar color auto-escalates: >80% red, >60% amber, otherwise the passed
 * `color` class. This is the same escalation the legacy OverviewTab used
 * before the dashboard refactor — kept identical so GenericDashboard renders
 * visually unchanged.
 */
export function ResourceBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : color;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {value.toFixed(1)}
          {unit} / {max.toFixed(0)}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
