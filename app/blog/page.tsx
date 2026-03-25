'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BLOG_POSTS, BLOG_CATEGORIES } from '@/lib/blog';
import { motion } from 'framer-motion';

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? BLOG_POSTS.filter((p) => p.category === activeCategory)
    : BLOG_POSTS;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Hatcher Blog
          </h1>
          <p className="text-[#a1a1aa] text-base sm:text-lg max-w-2xl mx-auto">
            Guides, tutorials, and insights about AI agents and the Hatcher platform.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
              activeCategory === null
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'border-white/10 text-[#71717a] hover:text-white hover:border-white/20'
            }`}
          >
            All
          </button>
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
                activeCategory === cat
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : 'border-white/10 text-[#71717a] hover:text-white hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col h-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all duration-300 overflow-hidden"
              >
                {/* Gradient top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-purple-600/40 via-purple-500/20 to-transparent" />

                <div className="flex flex-col flex-1 p-5">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {post.category}
                    </span>
                    <span className="text-[11px] text-[#71717a]">{post.readTime} read</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors duration-200 mb-2 leading-snug">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-[#a1a1aa] leading-relaxed flex-1 mb-4">
                    {post.excerpt}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] text-[#71717a] pt-3 border-t border-white/[0.06]">
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
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#71717a] text-sm">
            No articles found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
