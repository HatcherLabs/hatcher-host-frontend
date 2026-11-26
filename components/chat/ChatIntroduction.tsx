import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

/** Server-rendered public context, also visible below the empty guest workspace. */
export async function ChatIntroduction() {
  const [locale, landing, footer] = await Promise.all([getLocale(), getTranslations('landingV3'), getTranslations('footer')]);
  return (
    <section aria-labelledby="hatcher-platform-intro" className="mx-auto w-full max-w-[760px] px-6 py-5 text-sm leading-6 text-[var(--text-secondary)]">
      <h2 id="hatcher-platform-intro" className="mb-2 font-semibold text-[var(--text-primary)]">{landing('ecosystem.title')}</h2>
      <p>{landing('hero.sub')}</p>
      <p className="mt-2">{landing('ecosystem.sub')}</p>
      <nav className="mt-3 flex flex-wrap gap-x-5 gap-y-2 underline underline-offset-4" aria-labelledby="hatcher-platform-intro">
        <Link href="/platform">Hatcher</Link>
        <Link href="/frameworks">{landing('frameworks.boxLabel')}</Link>
        <Link href="/tutorials" locale={locale === 'en' ? undefined : 'en'}>{footer('itemTutorials')}</Link>
        <Link href="/pricing">{footer('links.pricing')}</Link>
      </nav>
    </section>
  );
}
