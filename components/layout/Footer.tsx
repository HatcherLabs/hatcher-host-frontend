import Link from 'next/link';
import { DOCS_URL, SOCIAL_LINKS, EXTERNAL_LINKS } from '@/lib/config';

const PRODUCT_LINKS = [
  { label: 'Create Agent', href: '/create' },
  { label: 'Explore', href: '/explore' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pricing', href: '/pricing' },
  { label: '$HATCH', href: '/token' },
];

const RESOURCE_LINKS = [
  { label: 'Documentation', href: DOCS_URL, external: true },
  { label: 'Support', href: '/support' },
  { label: 'Help', href: '/help' },
  { label: 'OpenClaw', href: EXTERNAL_LINKS.openclaw, external: true },
  { label: 'ClawHub Skills', href: EXTERNAL_LINKS.clawhub, external: true },
];

const COMMUNITY_LINKS = [
  { label: 'Twitter', href: SOCIAL_LINKS.twitter },
  { label: 'Discord', href: SOCIAL_LINKS.discord },
  { label: 'Telegram', href: SOCIAL_LINKS.telegram },
  { label: 'GitHub', href: SOCIAL_LINKS.github },
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
    href: SOCIAL_LINKS.telegram,
    label: 'Telegram',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    href: SOCIAL_LINKS.discord,
    label: 'Discord',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
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
              <svg viewBox="0 0 28 28" width="22" height="22" fill="none" className="drop-shadow-[0_0_6px_rgba(249,115,22,0.3)]">
                <ellipse cx="14" cy="15" rx="9" ry="11" fill="url(#eggGradF)" stroke="#f97316" strokeWidth="1" opacity="0.9" />
                <circle cx="14" cy="12" r="2" fill="#f97316" opacity="0.6" />
                <defs>
                  <linearGradient id="eggGradF" x1="14" y1="4" x2="14" y2="26" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#252240" />
                    <stop offset="100%" stopColor="#1A1730" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>Hatcher</span>
            </div>
            <p className="text-xs text-[#A5A1C2] leading-relaxed max-w-[200px]">
              Deploy autonomous AI agents across 20+ platforms. Powered by OpenClaw.
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
            <span className="font-medium text-[#A5A1C2]">Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
