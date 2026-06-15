import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

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
          background: 'linear-gradient(135deg, #050505 0%, #0A0F0A 50%, #050505 100%)',
          fontFamily: 'system-ui',
          padding: '60px',
        }}
      >
        {/* Decorative phosphor grid lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(57,255,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,136,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Phosphor green glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            height: 300,
            background: 'radial-gradient(ellipse, rgba(115,164,185,0.22) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 900, zIndex: 1 }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#73a4b9', letterSpacing: '-0.02em' }}>
              🥚 hatcher.host
            </div>
          </div>

          {/* Tag if present */}
          {tag && (
            <div
              style={{
                display: 'flex',
                padding: '6px 14px',
                background: 'rgba(115,164,185,0.12)',
                border: '1px solid rgba(115,164,185,0.35)',
                borderRadius: 20,
                color: '#73a4b9',
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
              color: '#d4d4d8',
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
              color: '#71717a',
              fontSize: 16,
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#a1a1aa' }}>Deploy AI agents in 60 seconds</span>
            <span style={{ color: '#3f3f46' }}>•</span>
            <span style={{ color: '#a1a1aa' }}>AI Credits included</span>
            <span style={{ color: '#3f3f46' }}>•</span>
            <span style={{ color: '#a1a1aa' }}>Choose any LLM</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
