import { ImageResponse } from 'next/og';
import { API_URL } from '@/lib/config';
import type { CityResponse } from '@/components/city/types';

// nodejs runtime — pm2-managed deploy doesn't ship the edge runtime.
// The OG payload is tiny and cached by the browser/CDN layer anyway.
export const runtime = 'nodejs';
export const alt = 'Hatcher City — every AI agent, in one 3D view';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function fetchCounts(): Promise<CityResponse['counts'] | null> {
  try {
    const res = await fetch(`${API_URL}/public/city`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: CityResponse };
    return json.success && json.data ? json.data.counts : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const counts = await fetchCounts();
  const total = counts?.total ?? 718;
  const running = counts?.running ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px',
          backgroundColor: '#050814',
          backgroundImage:
            'radial-gradient(circle at 20% 15%, rgba(168,85,247,0.28), transparent 50%), radial-gradient(circle at 80% 85%, rgba(56,189,248,0.22), transparent 50%)',
          color: '#e5e7eb',
          fontFamily: '"Inter", "Segoe UI", sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(transparent 97%, rgba(30,41,59,0.6) 97%), linear-gradient(90deg, transparent 97%, rgba(30,41,59,0.6) 97%)',
            backgroundSize: '60px 60px',
            opacity: 0.45,
          }}
        />

        <div
          style={{
            display: 'flex',
            backgroundColor: '#fbbf24',
            color: '#050814',
            padding: '8px 18px',
            alignSelf: 'flex-start',
            letterSpacing: 5,
            fontWeight: 900,
            fontSize: 20,
          }}
        >
          HATCHER CITY
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 110,
            fontWeight: 900,
            lineHeight: 0.98,
            marginTop: 32,
            color: '#ffffff',
            letterSpacing: -2,
          }}
        >
          <span>Every AI agent.</span>
          <span>One live city.</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 32,
            color: '#cbd5e1',
            letterSpacing: 0.5,
            maxWidth: 900,
          }}
        >
          {total.toLocaleString()} agents across 25 districts · {running} running right now · OpenClaw + Hermes.
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            fontSize: 24,
            color: '#94a3b8',
            letterSpacing: 2,
          }}
        >
          <span>
            hatcher.host/city ·{' '}
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>
              drag · zoom · click
            </span>
          </span>
          <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Dot color="#10b981" label="OpenClaw" />
            <Dot color="#38bdf8" label="Hermes" />
          </span>
        </div>
      </div>
    ),
    size,
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18 }}>
      <span style={{ width: 10, height: 10, background: color, display: 'flex' }} />
      {label}
    </span>
  );
}
