'use client';

import { memo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ReactMarkdown from 'react-markdown';

type ChartType = 'bar' | 'line' | 'pie';
type ChartDatum = Record<string, string | number>;

interface ChartArtifact {
  type: ChartType;
  title?: string;
  xKey: string;
  yKey: string;
  data: ChartDatum[];
}

export type MessagePart =
  | { kind: 'markdown'; content: string }
  | { kind: 'chart'; artifact: ChartArtifact };

const CHART_FENCE_RE = /```(?:hatcher-chart|chart|hatcher_artifact)\s*([\s\S]*?)```/gi;
const COLORS = ['#22d3ee', '#a3e635', '#f59e0b', '#f472b6', '#818cf8', '#34d399'];

function normalizeDatum(value: unknown): ChartDatum | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const out: ChartDatum = {};

  for (const [key, raw] of Object.entries(source)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
    } else if (typeof raw === 'string') {
      const maybeNumber = Number(raw);
      out[key] = raw.trim() !== '' && Number.isFinite(maybeNumber) ? maybeNumber : raw;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

function inferKeys(data: ChartDatum[], xKey?: unknown, yKey?: unknown) {
  const first = data[0] ?? {};
  const entries = Object.entries(first);
  const inferredX = typeof xKey === 'string'
    ? xKey
    : entries.find(([, value]) => typeof value === 'string')?.[0] ?? entries[0]?.[0] ?? 'label';
  const inferredY = typeof yKey === 'string'
    ? yKey
    : entries.find(([, value]) => typeof value === 'number')?.[0] ?? 'value';

  return { xKey: inferredX, yKey: inferredY };
}

function normalizeChartArtifact(raw: unknown): ChartArtifact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const rawType = String(source.type ?? source.chartType ?? source.kind ?? 'bar').toLowerCase();
  const type: ChartType =
    rawType === 'line' ? 'line' :
    rawType === 'pie' || rawType === 'donut' ? 'pie' :
    'bar';
  const rawData = Array.isArray(source.data) ? source.data : [];
  const data = rawData.map(normalizeDatum).filter((d): d is ChartDatum => Boolean(d));
  if (data.length === 0) return null;

  const { xKey, yKey } = inferKeys(data, source.xKey ?? source.labelKey, source.yKey ?? source.valueKey);
  if (!data.some((row) => typeof row[yKey] === 'number')) return null;

  return {
    type,
    title: typeof source.title === 'string' ? source.title : undefined,
    xKey,
    yKey,
    data,
  };
}

function parseChart(rawJson: string): ChartArtifact | null {
  try {
    return normalizeChartArtifact(JSON.parse(rawJson));
  } catch {
    return null;
  }
}

export function splitMessageArtifacts(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CHART_FENCE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ kind: 'markdown', content: content.slice(lastIndex, index) });
    }

    const artifact = parseChart(match[1] ?? '');
    if (artifact) {
      parts.push({ kind: 'chart', artifact });
    } else {
      parts.push({ kind: 'markdown', content: match[0] });
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ kind: 'markdown', content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ kind: 'markdown', content }];
}

export const RichMarkdown = memo(function RichMarkdown({ content }: { content: string }) {
  return (
    <>
      {splitMessageArtifacts(content).map((part, index) => {
        if (part.kind === 'chart') {
          return <ChartArtifactView key={`chart-${index}`} artifact={part.artifact} />;
        }
        return <ReactMarkdown key={`md-${index}`}>{part.content}</ReactMarkdown>;
      })}
    </>
  );
});

const ChartArtifactView = memo(function ChartArtifactView({ artifact }: { artifact: ChartArtifact }) {
  return (
    <div className="my-3 rounded-lg border border-white/10 bg-black/20 p-3 min-w-[260px]">
      {artifact.title && (
        <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">{artifact.title}</div>
      )}
      <div className="h-56 w-full min-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {artifact.type === 'line' ? (
            <LineChart data={artifact.data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey={artifact.xKey} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} width={36} />
              <Tooltip contentStyle={{ background: '#101014', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <Line type="monotone" dataKey={artifact.yKey} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : artifact.type === 'pie' ? (
            <PieChart>
              <Tooltip contentStyle={{ background: '#101014', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <Pie data={artifact.data} dataKey={artifact.yKey} nameKey={artifact.xKey} outerRadius={78} innerRadius={38} paddingAngle={2}>
                {artifact.data.map((_, index) => (
                  <Cell key={`slice-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={artifact.data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey={artifact.xKey} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} width={36} />
              <Tooltip contentStyle={{ background: '#101014', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <Bar dataKey={artifact.yKey} radius={[4, 4, 0, 0]}>
                {artifact.data.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
