export const AGENT_EMBED_THEMES = ['auto', 'light', 'dark'] as const;
export const AGENT_EMBED_ACCENTS = ['green', 'blue', 'purple'] as const;
export const AGENT_EMBED_POSITIONS = ['right', 'left'] as const;

export type AgentEmbedTheme = (typeof AGENT_EMBED_THEMES)[number];
export type AgentEmbedAccent = (typeof AGENT_EMBED_ACCENTS)[number];
export type AgentEmbedPosition = (typeof AGENT_EMBED_POSITIONS)[number];

export interface AgentEmbedOptions {
  theme: AgentEmbedTheme;
  accent: AgentEmbedAccent;
  position: AgentEmbedPosition;
}

const DEFAULT_OPTIONS: AgentEmbedOptions = {
  theme: 'auto',
  accent: 'green',
  position: 'right',
};

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T
): value is T[number] {
  return typeof value === 'string' && options.includes(value);
}

export function normalizeAgentEmbedOptions(input: {
  theme?: unknown;
  accent?: unknown;
  position?: unknown;
}): AgentEmbedOptions {
  return {
    theme: isOneOf(input.theme, AGENT_EMBED_THEMES) ? input.theme : DEFAULT_OPTIONS.theme,
    accent: isOneOf(input.accent, AGENT_EMBED_ACCENTS) ? input.accent : DEFAULT_OPTIONS.accent,
    position: isOneOf(input.position, AGENT_EMBED_POSITIONS)
      ? input.position
      : DEFAULT_OPTIONS.position,
  };
}

function normalizedSiteOrigin(siteUrl: string): string {
  const url = new URL(siteUrl);
  return url.origin;
}

export function buildAgentEmbedUrl(
  publicAgentId: string,
  options: Partial<AgentEmbedOptions> = {},
  siteUrl = 'https://hatcher.host'
): string {
  const normalized = normalizeAgentEmbedOptions(options);
  const url = new URL(
    `/embed/agent/${encodeURIComponent(publicAgentId)}`,
    normalizedSiteOrigin(siteUrl)
  );
  url.searchParams.set('theme', normalized.theme);
  url.searchParams.set('accent', normalized.accent);
  url.searchParams.set('widget', '1');
  return url.toString();
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function buildAgentEmbedSnippet(
  publicAgentId: string,
  options: Partial<AgentEmbedOptions> = {},
  siteUrl = 'https://hatcher.host'
): string {
  const normalized = normalizeAgentEmbedOptions(options);
  const origin = normalizedSiteOrigin(siteUrl);
  return `<script src="${escapeHtmlAttribute(`${origin}/embed/widget.js`)}" data-agent="${escapeHtmlAttribute(publicAgentId)}" data-theme="${normalized.theme}" data-accent="${normalized.accent}" data-position="${normalized.position}" defer></script>`;
}

export function agentEmbedAccentColor(accent: AgentEmbedAccent): string {
  if (accent === 'blue') return '#3b82f6';
  if (accent === 'purple') return '#8b5cf6';
  return '#00e676';
}

export function agentEmbedAccentForeground(accent: AgentEmbedAccent): string {
  return accent === 'green' ? '#07110b' : '#ffffff';
}
