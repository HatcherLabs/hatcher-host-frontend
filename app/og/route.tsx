import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Hatcher';
  const subtitle = searchParams.get('subtitle') || 'AI Agent Infrastructure';
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
          background: 'linear-gradient(135deg, #f6f2e8 0%, #dfeaf0 52%, #10110f 100%)',
          fontFamily: 'system-ui',
          padding: '54px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(16,17,15,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(16,17,15,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 64,
            right: 76,
            width: 390,
            height: 390,
            borderRadius: 36,
            background: 'linear-gradient(145deg, rgba(16,17,15,0.92), rgba(31,45,49,0.92))',
            border: '1px solid rgba(255,247,232,0.22)',
            display: 'flex',
            boxShadow: '0 34px 90px rgba(16,17,15,0.24)',
          }}
        >
          <div style={{ position: 'absolute', inset: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff7e8', fontSize: 18, fontWeight: 700 }}>
              <span>Agent Cloud</span>
              <span style={{ color: '#73a4b9', fontSize: 14, letterSpacing: '0.12em' }}>LIVE</span>
            </div>
            {['OpenClaw runtime', 'Hermes runtime', 'Hosted models', 'Wallet rails'].map((label, index) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 54,
                  padding: '0 16px',
                  borderRadius: 18,
                  background: 'rgba(255,247,232,0.08)',
                  border: '1px solid rgba(255,247,232,0.12)',
                  color: '#fff7e8',
                  fontSize: 16,
                }}
              >
                <span>{label}</span>
                <span style={{ display: 'flex', width: 72, height: 8, borderRadius: 999, background: index === 2 ? '#d6b56d' : '#73a4b9' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    flex: 1,
                    height: 70,
                    borderRadius: 20,
                    background: 'rgba(115,164,185,0.16)',
                    border: '1px solid rgba(115,164,185,0.25)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 1010, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                width: 34,
                height: 34,
                borderRadius: 11,
                background: '#10110f',
                border: '1px solid rgba(16,17,15,0.22)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', width: 14, height: 20, borderRadius: '50%', background: '#fff7e8', border: '2px solid #73a4b9' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 750, color: '#10110f', letterSpacing: '-0.02em' }}>
              hatcher.host
            </div>
          </div>

          {tag && (
            <div
              style={{
                display: 'flex',
                padding: '8px 15px',
                background: 'rgba(16,17,15,0.08)',
                border: '1px solid rgba(16,17,15,0.14)',
                borderRadius: 20,
                color: '#10110f',
                fontSize: 14,
                fontWeight: 750,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 20,
              }}
            >
              {tag}
            </div>
          )}

          <div
            style={{
              fontSize: title.length > 40 ? 48 : 66,
              fontWeight: 850,
              color: '#10110f',
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              marginBottom: 20,
              maxWidth: 600,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 25,
              color: '#354042',
              lineHeight: 1.35,
              maxWidth: 600,
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 44,
              gap: 12,
              color: '#10110f',
              fontSize: 15,
              alignItems: 'center',
              maxWidth: 610,
            }}
          >
            {['Hosted models', 'OpenClaw + Hermes', 'AI Credits', 'Runtime controls'].map((label) => (
              <span
                key={label}
                style={{
                  display: 'flex',
                  padding: '9px 13px',
                  borderRadius: 999,
                  background: 'rgba(255,247,232,0.72)',
                  border: '1px solid rgba(16,17,15,0.12)',
                  color: '#10110f',
                  fontWeight: 650,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
