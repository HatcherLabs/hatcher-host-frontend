import Link from 'next/link';
import { DOCS_URL, SOCIAL_LINKS, EXTERNAL_LINKS } from '@/lib/config';

const PRODUCT_LINKS = [
  { label: 'Create Agent', href: '/create' },
  { label: 'Templates', href: '/templates' },
  { label: 'Explore', href: '/explore' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Our Token', href: '/token' },
];

const RESOURCE_LINKS = [
  { label: 'Documentation', href: DOCS_URL, external: true },
  { label: 'Blog', href: '/blog' },
  { label: 'Support', href: '/support' },
  { label: 'Help', href: '/help' },
  { label: 'OpenClaw', href: EXTERNAL_LINKS.openclaw, external: true },
  { label: 'Hermes Agent', href: 'https://hermes-agent.nousresearch.com', external: true },
  { label: 'ClawHub Skills', href: EXTERNAL_LINKS.clawhub, external: true },
];

const COMMUNITY_LINKS = [
  { label: 'Twitter', href: SOCIAL_LINKS.twitter },
  { label: 'GitHub', href: SOCIAL_LINKS.github },
  { label: 'Discord', href: 'https://discord.gg/7tY3HjKjMc' },
  { label: 'Contact Us', href: 'mailto:contact@hatcher.host' },
];

const SOCIAL_ICONS = [
  {
    href: SOCIAL_LINKS.twitter,
    label: 'X (Twitter)',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    href: SOCIAL_LINKS.github,
    label: 'GitHub',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: 'https://discord.gg/7tY3HjKjMc',
    label: 'Discord',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 28 28" width="22" height="22" fill="none" className="drop-shadow-[0_0_6px_rgba(6,182,212,0.2)]">
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
              <span className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>Hatcher</span>
            </div>
            <p className="text-xs text-[#A5A1C2] leading-relaxed max-w-[200px]">
              Deploy autonomous AI agents across 20+ platforms. Powered by OpenClaw, Hermes, ElizaOS &amp; Milady.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-1.5 mt-4">
              {SOCIAL_ICONS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717a] hover:text-white hover:bg-white/[0.04] transition-colors duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#71717a] mb-3">Product</p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[#A5A1C2] hover:text-white transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#71717a] mb-3">Resources</p>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#A5A1C2] hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-[#A5A1C2] hover:text-white transition-colors duration-200">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#71717a] mb-3">Community</p>
            <ul className="space-y-2">
              {COMMUNITY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#A5A1C2] hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[#71717a]">&copy; {new Date().getFullYear()} HatcherLabs. All rights reserved.</span>
          <div className="flex items-center gap-3 text-xs text-[#71717a]">
            <span>Powered by</span>
            <span className="font-medium text-[#A5A1C2]">OpenClaw</span>
            <span>&middot;</span>
            <span className="font-medium text-[#A5A1C2]">Hermes</span>
            <span>&middot;</span>
            <span className="font-medium text-[#A5A1C2]">ElizaOS</span>
            <span>&middot;</span>
            <span className="font-medium text-[#A5A1C2]">Milady</span>
            <span>&middot;</span>
            <span className="font-medium text-[#A5A1C2]">Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
