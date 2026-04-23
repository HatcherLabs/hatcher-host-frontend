import { ImageResponse } from 'next/og';
import { API_URL } from '@/lib/config';
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_ICON } from '@/components/city/types';
import type { Category, CityResponse } from '@/components/city/types';

export const runtime = 'nodejs';
export const alt = 'Hatcher City district';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function isCategory(s: string): s is Category {
  return (CATEGORIES as readonly string[]).includes(s);
}

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

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) {
    return new ImageResponse(<div>Not found</div>, size);
  }

  const counts = await fetchCounts();
  const myCount = counts?.byCategory?.[category] ?? 0;
  const total = counts?.total ?? 0;
  const label = CATEGORY_LABELS[category];
  const icon = CATEGORY_ICON[category];
  const share = total > 0 ? Math.round((myCount / total) * 100) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px',
          backgroundColor: '#050814',
          backgroundImage:
            'radial-gradient(circle at 20% 15%, rgba(168,85,247,0.25), transparent 50%), radial-gradient(circle at 80% 85%, rgba(56,189,248,0.22), transparent 50%)',
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
            gap: 14,
            alignItems: 'center',
            color: '#fbbf24',
            fontSize: 22,
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              display: 'flex',
              backgroundColor: '#fbbf24',
              color: '#050814',
              padding: '6px 14px',
              letterSpacing: 4,
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            HATCHER CITY
          </span>
          <span style={{ display: 'flex', color: '#94a3b8', fontSize: 18, letterSpacing: 2 }}>/ district</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            alignItems: 'center',
            gap: 36,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 180,
              lineHeight: 1,
            }}
          >
            {icon}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 90,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: -1,
              }}
            >
              {label}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 10,
                fontSize: 32,
                color: '#cbd5e1',
                letterSpacing: 1,
              }}
            >
              {myCount} agents · {share}% of the city
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 22,
            color: '#94a3b8',
            letterSpacing: 2,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <span>Explore the live 3D city at</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>
              hatcher.host/city
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 18,
              fontWeight: 600,
              color: '#e5e7eb',
              fontSize: 20,
            }}
          >
            <span style={{ display: 'flex' }}>4 frameworks</span>
            <span style={{ display: 'flex', color: '#475569' }}>·</span>
            <span style={{ display: 'flex' }}>25 districts</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
