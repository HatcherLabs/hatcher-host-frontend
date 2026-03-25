import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
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
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 64, fontWeight: 'bold', color: 'white' }}>
            &#x1F95A; Hatcher
          </div>
          <div style={{ fontSize: 28, color: '#06b6d4', marginTop: 12 }}>
            AI Agent Hosting Platform
          </div>
          <div style={{ fontSize: 18, color: '#71717a', marginTop: 8 }}>
            Deploy &bull; Host &bull; Scale
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
