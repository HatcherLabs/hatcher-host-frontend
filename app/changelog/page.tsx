'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_CATEGORIES,
  type ChangelogCategory,
} from '@/lib/changelog';

const CATEGORY_COLORS: Record<ChangelogCategory, { pill: string; dot: string }> = {
  Feature:        { pill: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-400' },
  Improvement:    { pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',       dot: 'bg-cyan-400' },
  Fix:            { pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    dot: 'bg-amber-400' },
  Security:       { pill: 'bg-red-500/10 text-red-400 border-red-500/20',         dot: 'bg-red-400' },
  Infrastructure: { pill: 'bg-green-500/10 text-green-400 border-green-500/20',   dot: 'bg-green-400' },
  Test:           { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',      dot: 'bg-blue-400' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function isNew(dateStr: string, days = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(dateStr) >= cutoff;
}

export default function ChangelogPage() {
  const [activeCategory, setActiveCategory] = useState<ChangelogCategory | null>(null);

  const filtered = useMemo(() => {
    if (!activeCategory) return CHANGELOG_ENTRIES;
    return CHANGELOG_ENTRIES.filter((e) =>
      e.items.some((i) => i.category === activeCategory)
    ).map((e) => ({
      ...e,
      items: e.items.filter((i) => i.category === activeCategory),
    }));
  }, [activeCategory]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Changelog
            </h1>
            {isNew(CHANGELOG_ENTRIES[0]?.date ?? '') && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                New
              </span>
            )}
          </div>
          <p className="text-[#a1a1aa] text-base max-w-xl">
            Every update, fix, and improvement to the Hatcher platform — in one place.
          </p>

          {/* RSS link */}
          <a
            href="/changelog/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors duration-200"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
            </svg>
            RSS Feed
          </a>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
              activeCategory === null
                ? 'bg-white/[0.08] border-white/20 text-white'
                : 'border-white/10 text-[#71717a] hover:text-white hover:border-white/20'
            }`}
          >
            All
          </button>
          {CHANGELOG_CATEGORIES.map((cat) => {
            const colors = CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
                  activeCategory === cat
                    ? colors.pill + ' border-opacity-100'
                    : 'border-white/10 text-[#71717a] hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory ?? 'all'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.06]" aria-hidden="true" />

            <div className="space-y-10 pl-8">
              {filtered.map((entry, idx) => (
                <motion.div
                  key={entry.version}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.35 }}
                  className="relative"
                >
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0e0e14] bg-purple-500 flex-shrink-0"
                    aria-hidden="true"
                  />

                  {/* Card */}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    {/* Gradient accent */}
                    <div className="h-px w-full bg-gradient-to-r from-purple-600/50 via-purple-500/20 to-transparent" />

                    <div className="p-5 sm:p-6">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-xs font-mono font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                          v{entry.version}
                        </span>
                        {isNew(entry.date) && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            New
                          </span>
                        )}
                        <time
                          dateTime={entry.date}
                          className="text-xs text-[#71717a] ml-auto"
                        >
                          {formatDate(entry.date)}
                        </time>
                      </div>

                      <h2 className="text-base sm:text-lg font-semibold text-white mb-1.5">
                        {entry.title}
                      </h2>
                      <p className="text-sm text-[#a1a1aa] leading-relaxed mb-5">
                        {entry.summary}
                      </p>

                      {/* Items */}
                      <ul className="space-y-2">
                        {entry.items.map((item, i) => {
                          const colors = CATEGORY_COLORS[item.category];
                          return (
                            <li key={i} className="flex items-start gap-2.5">
                              <span
                                className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`}
                                aria-hidden="true"
                              />
                              <span className="flex-1 min-w-0">
                                <span
                                  className={`inline-flex items-center px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider rounded border mr-2 ${colors.pill}`}
                                >
                                  {item.category}
                                </span>
                                <span className="text-sm text-[#a1a1aa]">{item.text}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="pl-8 py-12 text-center">
                <p className="text-sm text-[#71717a]">
                  No entries for this category.
                </p>
                <button
                  onClick={() => setActiveCategory(null)}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                  Clear filter
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
