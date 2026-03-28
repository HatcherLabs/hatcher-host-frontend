'use client';

import { AlertTriangle } from 'lucide-react';

interface DataPoint {
  ts: number;
  cpu: number;
  mem: number;
}

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  alertThreshold?: number;
}

function Sparkline({ data, color, height = 32, alertThreshold }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ height }} className="flex items-center justify-center text-[10px] text-[#71717a]">No data</div>;
  }

  const max = Math.max(...data, alertThreshold ?? 0, 1);
  const width = 100;
  const padX = 2;
  const usableWidth = width - padX * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * usableWidth;
    const y = height - 2 - ((v / max) * (height - 4));
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const firstPt = points[0]!;
  const lastPt = points[points.length - 1]!;
  const fillPath = `M${firstPt} ${points.slice(1).map((p) => `L${p}`).join(' ')} L${lastPt.split(',')[0]},${height} L${firstPt.split(',')[0]},${height} Z`;

  const thresholdY = alertThreshold != null
    ? height - 2 - ((alertThreshold / max) * (height - 4))
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full overflow-visible"
      style={{ height }}
    >
      {/* Threshold line */}
      {thresholdY != null && (
        <line
          x1={padX}
          x2={width - padX}
          y1={thresholdY}
          y2={thresholdY}
          stroke="rgba(251,191,36,0.35)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
      )}
      {/* Fill area */}
      <path d={fillPath} fill={`url(#sparkGrad-${color.replace(/[^a-z0-9]/gi, '')})`} opacity="0.18" />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1]!.split(',');
        return (
          <circle cx={Number(last[0])} cy={Number(last[1])} r="2" fill={color} />
        );
      })()}
      <defs>
        <linearGradient id={`sparkGrad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface ResourceAlertBadgeProps {
  cpuPercent: number;
  memPercent: number;
}

export function ResourceAlertBadge({ cpuPercent, memPercent }: ResourceAlertBadgeProps) {
  const cpuHigh = cpuPercent >= 80;
  const memHigh = memPercent >= 85;

  if (!cpuHigh && !memHigh) return null;

  const label = cpuHigh && memHigh
    ? 'CPU & Memory high'
    : cpuHigh
    ? `CPU ${cpuPercent.toFixed(0)}%`
    : `Memory ${memPercent.toFixed(0)}%`;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-medium">
      <AlertTriangle size={9} />
      {label}
    </span>
  );
}

interface ResourceChartProps {
  history: DataPoint[];
  currentCpu: number;
  currentMem: number;
  memLimitMb: number;
}

export function ResourceChart({ history, currentCpu, currentMem, memLimitMb }: ResourceChartProps) {
  // Use up to last 48 points for the sparkline (most recent first → reverse for chart)
  const points = history.slice(-48);
  const cpuData = points.map((p) => p.cpu);
  const memData = points.map((p) => p.mem);

  const memPercent = memLimitMb > 0 ? (currentMem / memLimitMb) * 100 : 0;

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-white/[0.04]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-[#71717a]">Resource History (24h)</span>
        <ResourceAlertBadge cpuPercent={currentCpu} memPercent={memPercent} />
      </div>

      {/* CPU sparkline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#71717a]">CPU</span>
          <span className="text-[10px] tabular-nums text-[#A5A1C2]">{currentCpu.toFixed(1)}%</span>
        </div>
        <Sparkline
          data={cpuData.length > 0 ? cpuData : [currentCpu]}
          color="#06b6d4"
          height={36}
          alertThreshold={80}
        />
      </div>

      {/* Memory sparkline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#71717a]">Memory</span>
          <span className="text-[10px] tabular-nums text-[#A5A1C2]">
            {currentMem.toFixed(0)} / {memLimitMb} MB
          </span>
        </div>
        <Sparkline
          data={memData.length > 0 ? memData : [currentMem]}
          color="#3b82f6"
          height={36}
          alertThreshold={memLimitMb > 0 ? memLimitMb * 0.85 : undefined}
        />
      </div>
    </div>
  );
}
