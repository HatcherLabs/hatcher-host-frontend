import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Hatcher';
  const subtitle = searchParams.get('subtitle') || 'AI Agent Hosting Platform';
  const tag = searchParams.get('tag') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0D0B1A 0%, #1a1333 50%, #0D0B1A 100%)',
          fontFamily: 'system-ui',
          padding: '60px',
        }}
      >
        {/* Decorative grid lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Purple glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            height: 300,
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 900, zIndex: 1 }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.02em' }}>
              🥚 hatcher.host
            </div>
          </div>

          {/* Tag if present */}
          {tag && (
            <div
              style={{
                display: 'flex',
                padding: '6px 14px',
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 20,
                color: '#c4b5fd',
                fontSize: 14,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 20,
              }}
            >
              {tag}
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 40 ? 44 : 56,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 20,
              maxWidth: 860,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              maxWidth: 760,
            }}
          >
            {subtitle}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              marginTop: 40,
              gap: 32,
              color: '#52525b',
              fontSize: 16,
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Deploy AI agents in 60 seconds</span>
            <span style={{ color: '#3f3f46' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Free tier included</span>
            <span style={{ color: '#3f3f46' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>BYOK any LLM</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
