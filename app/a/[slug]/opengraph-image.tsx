import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Hatcher Agent';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FRAMEWORK_COLORS: Record<string, string> = {
  openclaw: '#a855f7',
  hermes: '#3b82f6',
  elizaos: '#f59e0b',
  milady: '#ec4899',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  elizaos: 'ElizaOS',
  milady: 'Milady',
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let name = slug;
  let description = 'An AI agent hosted on Hatcher';
  let framework = 'openclaw';

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.hatcher.host';
    const res = await fetch(`${apiUrl}/agents/public/${slug}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      name = data.name || slug;
      description = data.description || description;
      framework = data.framework || framework;
    }
  } catch {
    // Use defaults
  }

  const fwColor = FRAMEWORK_COLORS[framework] || '#a855f7';
  const fwLabel = FRAMEWORK_LABELS[framework] || framework;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${fwColor}, #06b6d4)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            padding: '0 80px',
            textAlign: 'center',
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${fwColor}, #06b6d4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              color: 'white',
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          {/* Agent name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.1,
              maxWidth: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>

          {/* Framework badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 999,
              background: `${fwColor}20`,
              border: `1px solid ${fwColor}40`,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: fwColor }} />
            <span style={{ fontSize: 20, color: fwColor, fontWeight: 600 }}>{fwLabel}</span>
          </div>

          {/* Description */}
          {description && (
            <div
              style={{
                fontSize: 22,
                color: '#a1a1aa',
                maxWidth: 700,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {description.slice(0, 120)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              background: `linear-gradient(90deg, ${fwColor}, #06b6d4)`,
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            hatcher.host
          </div>
          <div style={{ fontSize: 18, color: '#52525b' }}>|</div>
          <div style={{ fontSize: 18, color: '#71717a' }}>AI Agent Hosting</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
