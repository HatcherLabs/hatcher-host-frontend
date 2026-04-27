'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { BLOG_POSTS, BLOG_CATEGORIES, searchPosts } from '@/lib/blog';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';

export default function BlogPage() {
  const t = useTranslations('blog');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let posts = searchQuery ? searchPosts(searchQuery) : BLOG_POSTS;
    if (activeCategory) {
      posts = posts.filter((p) => p.category === activeCategory);
    }
    return posts;
  }, [activeCategory, searchQuery]);

  // Featured post is the first (newest) post when no search/filter is active
  const showFeatured = !searchQuery && !activeCategory;
  const featuredPost = showFeatured ? filtered[0] : null;
  const gridPosts = showFeatured ? filtered.slice(1) : filtered;

  return (
    <MarketingShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('eyebrow')}</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            {t('heading')}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            {t('subheading')}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
              activeCategory === null
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'border-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20'
            }`}
          >
            {t('allCategory')}
          </button>
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
                activeCategory === cat
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : 'border-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count when searching */}
        {searchQuery && (
          <div className="text-center mb-6">
            <p className="text-sm text-[var(--text-muted)]">
              {filtered.length === 1
                ? t('resultsCount', { count: filtered.length, query: searchQuery })
                : t('resultsCountPlural', { count: filtered.length, query: searchQuery })}
            </p>
          </div>
        )}

        {/* Featured post (only when no search/filter active) */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group block rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--color-accent)]/30 transition-colors overflow-hidden"
            >
              <div className="h-0.5 w-full bg-[var(--color-accent)]/40" />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                    {featuredPost.category}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">{featuredPost.readTime} {t('readLabel')}</span>
                  <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)]">
                    {t('latestLabel')}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-purple-300 transition-colors duration-200 mb-3 leading-snug">
                  {featuredPost.title}
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-5 max-w-3xl">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-4 border-t border-[var(--border-default)]">
                  <span className="font-medium">{featuredPost.author}</span>
                  <time dateTime={featuredPost.date}>
                    {new Date(featuredPost.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Articles grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {gridPosts.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col h-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--color-accent)]/30 transition-colors overflow-hidden"
                >
                  <div className="h-0.5 w-full bg-[var(--color-accent)]/30" />

                  <div className="flex flex-col flex-1 p-5">
                    {/* Meta */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                        {post.category}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{post.readTime} {t('readLabel')}</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-purple-300 transition-colors duration-200 mb-2 leading-snug">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1 mb-4">
                      {post.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-default)]">
                      <span>{post.author}</span>
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </time>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-sm mb-3">
              {searchQuery
                ? t('noArticlesSearch', { query: searchQuery })
                : t('noArticlesCategory')}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(null);
              }}
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-200"
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>
    </MarketingShell>
  );
}
