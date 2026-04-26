// components/marketing/v3/links.ts
//
// Single source of truth for marketing chrome navigation. Nav, NavDrawer,
// and Footer all import from here. Adding/removing/renaming a link in
// one place updates everywhere — prevents the dead-link drift that bit v2.
//
// Rule: every href listed here MUST be a real, reachable route. If a
// route is proposed but doesn't exist yet, it does NOT belong in this file.

export type ExternalHref = `https://${string}` | `mailto:${string}`;
export type InternalHref = `/${string}`;
export type Href = InternalHref | ExternalHref;

export interface NavGroup {
  key: 'build' | 'explore' | 'resources';
  label: string;
  items: ReadonlyArray<{
    key: string;
    label: string;
    sub: string;
    href: Href;
    glyph: string;
  }>;
}

export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    key: 'build',
    label: 'Build',
    items: [
      { key: 'hatchAgent',  label: 'Hatch agent (chat)',     sub: 'Describe what you want — done in seconds.', href: '/chat-to-hatch', glyph: '✦' },
      { key: 'createTpl',   label: 'Create from template',    sub: 'Pick a framework + tools manually.',         href: '/create',        glyph: '⊞' },
      { key: 'myAgents',    label: 'My agents',               sub: 'Dashboard for your running agents.',         href: '/dashboard',     glyph: '◐' },
    ],
  },
  {
    key: 'explore',
    label: 'Explore',
    items: [
      { key: 'city',        label: 'Hatcher City',            sub: 'Walk a 3D world of live agents.',            href: '/city',          glyph: '◇' },
      { key: 'frameworks',  label: 'Frameworks',              sub: 'OpenClaw · Hermes · ElizaOS · Milady.',      href: '/frameworks',    glyph: '◆' },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    items: [
      { key: 'pricing',     label: 'Pricing',                 sub: 'Free · Starter · Pro · Business · Founding.', href: '/pricing',     glyph: '★' },
      { key: 'token',       label: '$HATCHER',                sub: 'Token, treasury, burn mechanics.',           href: '/token',         glyph: '◉' },
      { key: 'blog',        label: 'Blog',                    sub: 'Notes, releases, deep dives.',               href: '/blog',          glyph: '✎' },
      { key: 'roadmap',     label: 'Roadmap',                 sub: 'What we ship next.',                         href: '/roadmap',       glyph: '𝍌' },
      { key: 'changelog',   label: 'Changelog',               sub: 'What changed and when.',                     href: '/changelog',     glyph: '⌖' },
    ],
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    head: 'Build',
    items: [
      { label: 'Hatch agent',          href: '/chat-to-hatch' as Href },
      { label: 'Create from template', href: '/create' as Href },
      { label: 'My agents',            href: '/dashboard' as Href },
    ],
  },
  {
    head: 'Explore',
    items: [
      { label: 'Hatcher City', href: '/city' as Href },
      { label: 'Frameworks',   href: '/frameworks' as Href },
    ],
  },
  {
    head: 'Resources',
    items: [
      { label: 'Pricing',   href: '/pricing' as Href },
      { label: '$HATCHER',  href: '/token' as Href },
      { label: 'Blog',      href: '/blog' as Href },
      { label: 'Roadmap',   href: '/roadmap' as Href },
      { label: 'Changelog', href: '/changelog' as Href },
    ],
  },
  {
    head: 'Legal',
    items: [
      { label: 'Privacy',   href: '/privacy' as Href },
      { label: 'Terms',     href: '/terms' as Href },
      { label: 'Cookies',   href: '/cookies' as Href },
      { label: 'Impressum', href: '/impressum' as Href },
    ],
  },
] as const;

export const SOCIAL_LINKS = {
  x:       'https://x.com/HatcherLabs',
  discord: 'https://discord.gg/7tY3HjKjMc',
  github:  'https://github.com/HatcherLabs',
} as const;

export const PRIMARY_CTA = {
  href: '/chat-to-hatch' as Href,
  label: 'Hatch agent',
} as const;

export const SECONDARY_CTA = {
  href: '/login' as Href,
  label: 'Sign in',
} as const;
