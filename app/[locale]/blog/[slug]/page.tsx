import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import type { Metadata } from 'next';
import { BLOG_POSTS, getBlogPost, getRelatedPosts } from '@/lib/blog';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Not Found' };
  const ogImageUrl = `https://hatcher.host/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.excerpt)}&tag=${encodeURIComponent(post.category)}`;
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://hatcher.host/blog/${post.slug}`,
      siteName: 'Hatcher',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImageUrl],
    },
    alternates: { canonical: `https://hatcher.host/blog/${post.slug}` },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const t = await getTranslations('blog');
  const related = getRelatedPosts(slug, 3);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Hatcher',
      url: 'https://hatcher.host',
      logo: { '@type': 'ImageObject', url: 'https://hatcher.host/icon.svg' },
    },
    datePublished: post.date,
    url: `https://hatcher.host/blog/${post.slug}`,
    image: `https://hatcher.host/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.excerpt)}&tag=${encodeURIComponent(post.category)}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://hatcher.host/blog/${post.slug}` },
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-purple-400 transition-colors duration-200 mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t('backToBlog')}
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {post.category}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{post.readTime} {t('readLabel')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-white">{post.author}</span>
            <span className="text-[var(--text-muted)]">&middot;</span>
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </div>
        </header>

        {/* Article content */}
        <div
          className="prose prose-invert prose-purple max-w-none
            prose-headings:font-semibold prose-headings:text-white
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-[#c4c4cc] prose-p:leading-relaxed
            prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
            prose-li:text-[#c4c4cc]
            prose-strong:text-white
            prose-blockquote:border-purple-500/40 prose-blockquote:bg-purple-500/5 prose-blockquote:rounded-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-[var(--text-secondary)]
            prose-table:border-collapse prose-th:text-left prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:text-[var(--text-muted)] prose-th:pb-2 prose-th:border-b prose-th:border-white/10
            prose-td:py-2 prose-td:pr-6 prose-td:text-sm prose-td:text-[#c4c4cc] prose-td:border-b prose-td:border-[var(--border-default)]"
          dangerouslySetInnerHTML={{ __html: post.content }} // SAFE: content from hardcoded lib/blog.ts, not user input
        />

        {/* Divider */}
        <div className="border-t border-[var(--border-default)] my-14" />

        {/* Related articles */}
        {related.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-6">{t('relatedArticles')}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card)] hover:border-purple-500/20 p-4 transition-all duration-300"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-1.5 block">
                    {r.category}
                  </span>
                  <span className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors duration-200 leading-snug block">
                    {r.title}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-2 block">{r.readTime} read</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </MarketingShell>
  );
}
