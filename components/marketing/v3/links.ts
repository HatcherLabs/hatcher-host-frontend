// components/marketing/v3/links.ts
//
// Single source of truth for marketing chrome navigation. Nav, NavDrawer,
// and Footer all import from here. Adding/removing/renaming a link in
// one place updates everywhere — prevents the dead-link drift that bit v2.
//
// All visible labels are i18n keys (resolved via useTranslations) instead
// of literal strings, so the chrome translates across en/zh/de/fr/ro
// without per-locale forks.
//
// Rule: every href listed here MUST be a real, reachable route. If a
// route is proposed but doesn't exist yet, it does NOT belong in this file.

export type ExternalHref = `https://${string}` | `mailto:${string}`;
export type InternalHref = `/${string}`;
export type Href = InternalHref | ExternalHref;

export interface NavGroup {
  key: 'build' | 'explore' | 'resources';
  /** Translation key under namespace `nav.groups` */
  labelKey: string;
  items: ReadonlyArray<{
    key: string;
    /** Translation key under namespace `nav.groups` */
    labelKey: string;
    /** Translation key under namespace `nav.groups` */
    subKey: string;
    href: Href;
    glyph: string;
  }>;
}

export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    key: 'build',
    labelKey: 'build',
    items: [
      { key: 'hatchAgent',  labelKey: 'hatchAgentLabel',  subKey: 'hatchAgentSub',  href: '/chat-to-hatch', glyph: '✦' },
      { key: 'createTpl',   labelKey: 'createTplLabel',   subKey: 'createTplSub',   href: '/create',        glyph: '⊞' },
      { key: 'myAgents',    labelKey: 'myAgentsLabel',    subKey: 'myAgentsSub',    href: '/dashboard',     glyph: '◐' },
    ],
  },
  {
    key: 'explore',
    labelKey: 'explore',
    items: [
      { key: 'city',        labelKey: 'cityLabel',        subKey: 'citySub',        href: '/city',          glyph: '◇' },
      { key: 'frameworks',  labelKey: 'frameworksLabel',  subKey: 'frameworksSub',  href: '/frameworks',    glyph: '◆' },
    ],
  },
  {
    key: 'resources',
    labelKey: 'resources',
    items: [
      { key: 'pricing',     labelKey: 'pricingLabel',     subKey: 'pricingSub',     href: '/pricing',       glyph: '★' },
      { key: 'token',       labelKey: 'tokenLabel',       subKey: 'tokenSub',       href: '/token',         glyph: '◉' },
      { key: 'blog',        labelKey: 'blogLabel',        subKey: 'blogSub',        href: '/blog',          glyph: '✎' },
      { key: 'roadmap',     labelKey: 'roadmapLabel',     subKey: 'roadmapSub',     href: '/roadmap',       glyph: '𝍌' },
      { key: 'changelog',   labelKey: 'changelogLabel',   subKey: 'changelogSub',   href: '/changelog',     glyph: '⌖' },
    ],
  },
] as const;

/** Footer columns. `headKey` resolves under namespace `footer`; each
 *  item's `labelKey` under the same namespace. */
export const FOOTER_COLUMNS = [
  {
    headKey: 'colBuild',
    items: [
      { labelKey: 'itemHatchAgent', href: '/chat-to-hatch' as Href },
      { labelKey: 'itemCreateTpl',  href: '/create' as Href },
      { labelKey: 'itemMyAgents',   href: '/dashboard' as Href },
    ],
  },
  {
    headKey: 'colExplore',
    items: [
      { labelKey: 'itemCity',       href: '/city' as Href },
      { labelKey: 'itemFrameworks', href: '/frameworks' as Href },
    ],
  },
  {
    headKey: 'colResources',
    items: [
      { labelKey: 'itemPricing',   href: '/pricing' as Href },
      { labelKey: 'itemToken',     href: '/token' as Href },
      { labelKey: 'itemBlog',      href: '/blog' as Href },
      { labelKey: 'itemRoadmap',   href: '/roadmap' as Href },
      { labelKey: 'itemChangelog', href: '/changelog' as Href },
    ],
  },
  {
    headKey: 'colLegal',
    items: [
      { labelKey: 'itemPrivacy',   href: '/privacy' as Href },
      { labelKey: 'itemTerms',     href: '/terms' as Href },
      { labelKey: 'itemCookies',   href: '/cookies' as Href },
      { labelKey: 'itemImpressum', href: '/impressum' as Href },
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
  /** Translation key under namespace `nav`. Brand-distinct verb that
   *  matches the footer's `itemHatchAgent` copy — the previous reuse
   *  of `nav.create` rendered as "Create" / "创建" etc., which links
   *  to /create (template picker), not /chat-to-hatch. */
  labelKey: 'hatchAgent',
} as const;

export const SECONDARY_CTA = {
  href: '/login' as Href,
  /** Translation key under namespace `nav`. */
  labelKey: 'signIn',
} as const;
