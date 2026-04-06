import Link from 'next/link';
import { DOCS_URL, SOCIAL_LINKS } from '@/lib/config';

const PRODUCT_LINKS = [
  { label: 'Create Agent', href: '/create' },
  { label: 'Explore', href: '/explore' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Status', href: '/status' },
];

const RESOURCE_LINKS = [
  { label: 'Documentation', href: DOCS_URL, external: true },
  { label: 'Support', href: '/support' },
  { label: 'Blog', href: '/blog' },
];

const SOCIAL_ICONS = [
  {
    href: SOCIAL_LINKS.twitter,
    label: 'X (Twitter)',
    hoverClass: 'hover:text-sky-400',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    href: SOCIAL_LINKS.github,
    label: 'GitHub',
    hoverClass: 'hover:text-[var(--text-primary)]',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: 'https://discord.gg/7tY3HjKjMc',
    label: 'Discord',
    hoverClass: 'hover:text-indigo-400',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    href: SOCIAL_LINKS.telegram,
    label: 'Telegram',
    hoverClass: 'hover:text-sky-400',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

const COMMUNITY_ICONS = [
  ...SOCIAL_ICONS,
  {
    href: 'mailto:contact@hatcher.host',
    label: 'Contact Us',
    hoverClass: 'hover:text-emerald-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="h-px bg-[var(--border-default)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 28 28" width="22" height="22" fill="none">
                <defs>
                  <linearGradient id="eggShellF" x1="14" y1="3" x2="14" y2="27" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3D375E" />
                    <stop offset="50%" stopColor="#252240" />
                    <stop offset="100%" stopColor="#1A1730" />
                  </linearGradient>
                  <radialGradient id="eggGlowF" cx="50%" cy="40%" r="40%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggShellF)" stroke="rgba(6,182,212,0.5)" strokeWidth="0.8" />
                <path d="M14 4 C8.5 4, 5 10, 5 15.5 C5 21, 9 26, 14 26 C19 26, 23 21, 23 15.5 C23 10, 19.5 4, 14 4Z" fill="url(#eggGlowF)" />
                <path d="M10 14.5 L12.5 12.5 L11 10.5 L13.5 9 L12 7" stroke="#06b6d4" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.5" />
                <circle cx="12" cy="11" r="1.5" fill="#06b6d4" opacity="0.25" />
              </svg>
              <span className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>Hatcher</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-3">Product</p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-3">Resources</p>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-3">Community</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNITY_ICONS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] ${s.hoverClass} hover:bg-[var(--bg-card)] transition-colors duration-200`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border-default)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-muted)]">&copy; {new Date().getFullYear()} HatcherLabs. All rights reserved.</span>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors duration-200">Pricing</Link>
            <Link href="/support" className="hover:text-[var(--text-primary)] transition-colors duration-200">Support</Link>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors duration-200">Docs</a>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors duration-200">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors duration-200">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
