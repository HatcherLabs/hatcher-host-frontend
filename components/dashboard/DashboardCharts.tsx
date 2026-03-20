'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// ── Mini Donut for Stat Cards ───────────────────────────────
export function MiniDonut({
  value,
  color,
  size = 44,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  const data = [
    { name: 'filled', value: value },
    { name: 'empty', value: 100 - value },
  ];
  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill={color + '20'} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Feature Usage Donut ─────────────────────────────────────
export function FeatureDonut({
  data,
  total,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
}) {
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Center total */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <span className="font-bold text-2xl" style={{ color: '#FFFFFF' }}>
          {total}
        </span>
        <span className="text-xs" style={{ color: '#71717a' }}>
          Total
        </span>
      </div>
    </div>
  );
}

// ── Agent Status Bar Chart ──────────────────────────────────
export function AgentStatusChart({
  data,
}: {
  data: Array<{ name: string; count: number; color: string }>;
}) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,43,74,0.3)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(46,43,74,0.4)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#252240',
              border: '1px solid rgba(46,43,74,0.6)',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '13px',
            }}
            cursor={{ fill: 'rgba(249,115,22,0.06)' }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
