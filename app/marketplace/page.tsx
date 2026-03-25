'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn, timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
  SearchX,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react';

type SortOption = 'popular' | 'newest';
type CategoryFilter = 'all' | 'business' | 'development' | 'crypto' | 'research' | 'support' | 'custom';
type FrameworkFilter = 'all' | 'openclaw' | 'hermes';

const PAGE_SIZE = 12;

const SORT_LABELS: Record<SortOption, string> = {
  popular: 'Popular',
  newest: 'Newest',
};

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  business: 'Business',
  development: 'Development',
  crypto: 'Crypto',
  research: 'Research',
  support: 'Support',
  custom: 'Custom',
};

const CATEGORY_COLORS: Record<string, string> = {
  business: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  development: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  crypto: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  research: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  support: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  custom: 'bg-gray-500/10 text-gray-400 border-gray-500/25',
};

const FRAMEWORK_LABELS: Record<FrameworkFilter, string> = {
  all: 'All Frameworks',
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
};

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  author: string;
  authorId: string;
  usageCount: number;
  createdAt: string;
}

const cardClass = 'card glass-noise';

// ── Debounce hook ────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ── Animation variants ───────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function TemplateSkeleton() {
  return (
    <div className={cn(cardClass, 'p-5 animate-pulse')}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 shimmer rounded-lg w-3/4" />
          <div className="h-3 shimmer rounded-lg w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 shimmer rounded-lg" />
        <div className="h-3 shimmer rounded-lg w-5/6" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 shimmer rounded-full w-16" />
        <div className="h-5 shimmer rounded-full w-20" />
      </div>
      <div className="flex justify-between pt-3 border-t border-[var(--border-default)]">
        <div className="h-3 shimmer rounded-lg w-16" />
        <div className="h-8 shimmer rounded-lg w-28" />
      </div>
    </div>
  );
}

// ── Pagination helper ───────────────────────────────────────
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export default function MarketplacePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('popular');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [framework, setFramework] = useState<FrameworkFilter>('all');
  const [page, setPage] = useState(1);
  const [cloning, setCloning] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const search = useDebounce(searchInput, 300);
  const isSearching = searchInput !== search;

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getMarketplaceTemplates({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      framework: framework !== 'all' ? framework : undefined,
      sort,
      page,
      limit: PAGE_SIZE,
    }).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setTemplates(res.data.templates ?? []);
        setTotal(res.data.total ?? 0);
      } else {
        setError('error' in res ? res.error : 'Failed to load templates');
      }
    }).catch(() => {
      setLoading(false);
      setError('Network error -- is the API running?');
    });
  }, [search, category, framework, sort, page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, framework, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const hasActiveFilters = category !== 'all' || framework !== 'all' || search.trim() !== '';

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setCategory('all');
    setFramework('all');
    setSort('popular');
  }, []);

  const handleClone = useCallback(async (templateId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setCloning(templateId);
    try {
      const res = await api.cloneFromMarketplace(templateId);
      if (res.success && res.data) {
        router.push(`/dashboard/agent/${res.data.agentId}`);
      } else {
        alert('error' in res ? res.error : 'Failed to clone template');
      }
    } catch {
      alert('Network error');
    } finally {
      setCloning(null);
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_70%_20%,rgba(168,85,247,0.06),transparent)]" />
        <motion.div
          className="mx-auto max-w-7xl px-4 pt-16 pb-12 relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-2">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs font-medium mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Store className="w-3.5 h-3.5" />
              Community Templates
            </motion.div>
            <div className="flex items-center justify-center gap-4 mb-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)]">
                Community Templates
              </h1>
            </div>
            <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
              {loading
                ? 'Loading templates...'
                : `${total} template${total !== 1 ? 's' : ''} shared by the community`}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        {/* Search + Filter Bar */}
        <motion.div
          className="flex flex-col gap-4 mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-80 group/search">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-focus-within/search:text-[#f97316] transition-colors duration-200" />
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#f97316]/50 focus:shadow-[0_0_16px_rgba(249,115,22,0.12)] transition-all duration-200 backdrop-blur-xl"
                placeholder="Search templates by name or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.1)] transition-all duration-150"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 text-[#f97316] animate-spin" />
                </div>
              )}
            </div>

            {/* Category filter */}
            <div className="flex gap-1 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1 overflow-x-auto">
              {(Object.entries(CATEGORY_LABELS) as [CategoryFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setCategory(val)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium whitespace-nowrap',
                    category === val
                      ? 'bg-[#f97316] text-white shadow-[0_0_12px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(249,115,22,0.05)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Framework filter */}
            <div className="flex gap-1 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1 overflow-x-auto">
              {(Object.entries(FRAMEWORK_LABELS) as [FrameworkFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFramework(val)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium whitespace-nowrap',
                    framework === val
                      ? 'bg-[#f97316] text-white shadow-[0_0_12px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(249,115,22,0.05)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-1 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1 overflow-x-auto">
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSort(val)}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium whitespace-nowrap',
                    sort === val
                      ? 'bg-[#f97316] text-white shadow-[0_0_12px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(249,115,22,0.05)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Results summary */}
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              <motion.p
                key={`${total}-${search}-${category}-${framework}`}
                className="text-sm text-[var(--text-muted)]"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {hasActiveFilters ? (
                  <>
                    Showing <span className="text-[var(--text-secondary)] font-medium">{templates.length}</span> of{' '}
                    <span className="text-[var(--text-secondary)] font-medium">{total}</span> templates
                    {isSearching && <span className="text-[#f97316] ml-2">searching...</span>}
                  </>
                ) : (
                  <>
                    <span className="text-[var(--text-secondary)] font-medium">{total}</span> template{total !== 1 ? 's' : ''}
                    {totalPages > 1 && (
                      <span className="ml-2">
                        -- page {safePage} of {totalPages}
                      </span>
                    )}
                  </>
                )}
              </motion.p>
            </AnimatePresence>

            {hasActiveFilters && (
              <motion.button
                className="flex items-center gap-1.5 text-xs font-medium text-[#f97316] hover:text-[#fb923c] transition-colors duration-150 px-2.5 py-1 rounded-lg hover:bg-[rgba(249,115,22,0.08)]"
                onClick={clearAllFilters}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <X className="w-3 h-3" />
                Clear all filters
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <div ref={gridRef} className="scroll-mt-8">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <TemplateSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className={cn(cardClass, 'p-8 text-center')}>
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-[var(--text-muted)] text-xs mt-2">Check your connection and try again</p>
              <button
                onClick={fetchTemplates}
                className="btn-secondary inline-flex items-center gap-2 mt-4"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : templates.length === 0 && !hasActiveFilters ? (
            <motion.div
              className={cn(cardClass, 'p-16 text-center')}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 rounded-2xl bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.15)] flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-[#f97316]/60" />
              </div>
              <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">No templates yet</h3>
              <p className="text-[var(--text-muted)] mb-6">
                Be the first to share an agent template with the community!
              </p>
              <Link
                href="/dashboard/agents"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Go to My Agents
              </Link>
            </motion.div>
          ) : templates.length === 0 ? (
            <motion.div
              className={cn(cardClass, 'p-16 text-center max-w-lg mx-auto')}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.15)] flex items-center justify-center mx-auto mb-5">
                <SearchX className="w-8 h-8 text-[#f97316]/60" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No templates found</h3>
              <p className="text-[var(--text-muted)] text-sm mb-1.5">
                {search
                  ? `No results for "${search.length > 30 ? search.slice(0, 30) + '...' : search}"`
                  : 'No templates match the selected filters.'}
              </p>
              <p className="text-[var(--text-muted)] text-xs mb-6">
                Try adjusting your search or filter criteria.
              </p>
              <button
                className="btn-secondary inline-flex items-center gap-2"
                onClick={clearAllFilters}
              >
                <Filter className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`page-${safePage}-${search}-${category}-${framework}-${sort}`}
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={pageVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClone={handleClone}
                      cloning={cloning === template.id}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  className="flex items-center justify-center gap-2 mt-10"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className={cn(
                      'p-2 rounded-xl transition-all duration-200',
                      safePage <= 1
                        ? 'text-[var(--text-muted)]/30 cursor-not-allowed'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)]'
                    )}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {generatePageNumbers(safePage, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-[var(--text-muted)] text-sm select-none">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p as number)}
                          className={cn(
                            'min-w-[36px] h-9 rounded-xl text-sm font-medium transition-all duration-200',
                            safePage === p
                              ? 'bg-[#f97316] text-white shadow-[0_0_16px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)]'
                          )}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className={cn(
                      'p-2 rounded-xl transition-all duration-200',
                      safePage >= totalPages
                        ? 'text-[var(--text-muted)]/30 cursor-not-allowed'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)]'
                    )}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Template Card ────────────────────────────────────────────

function TemplateCard({
  template,
  onClone,
  cloning,
}: {
  template: MarketplaceTemplate;
  onClone: (id: string) => void;
  cloning: boolean;
}) {
  const categoryColor = CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.custom;
  const frameworkBadge = template.framework === 'hermes'
    ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
    : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/25';

  return (
    <motion.div variants={cardVariants}>
      <div className="group relative">
        {/* Gradient border glow on hover */}
        <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(168,85,247,0.15))', borderRadius: '16px' }} />
        <motion.div
          className={cn(cardClass, 'p-5 h-full flex flex-col relative')}
          whileHover={{
            y: -4,
            boxShadow: '0 12px 40px rgba(249, 115, 22, 0.12)',
          }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)' }} />

          {/* Header: icon + name */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.15)] flex items-center justify-center flex-shrink-0 group-hover:border-[rgba(249,115,22,0.3)] group-hover:shadow-[0_0_16px_rgba(249,115,22,0.15)] transition-all duration-300">
              <Package className="w-6 h-6 text-[#f97316]/70" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#FFFFFF] truncate group-hover:text-[#f97316] transition-colors duration-200">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${frameworkBadge}`}>
                  {template.framework === 'hermes' ? 'Hermes' : 'OpenClaw'}
                </span>
                <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${categoryColor}`}>
                  {template.category}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#A5A1C2] leading-relaxed mb-4 flex-1 line-clamp-2">
            {template.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[rgba(46,43,74,0.3)] group-hover:border-[rgba(249,115,22,0.15)] transition-colors duration-300">
            <div className="flex items-center gap-3 text-xs text-[#71717a]">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {template.author}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                {template.usageCount}
              </span>
              <span>{timeAgo(template.createdAt)}</span>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                onClone(template.id);
              }}
              disabled={cloning}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                cloning
                  ? 'bg-[#f97316]/20 text-[#f97316]/60 cursor-wait'
                  : 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/25 hover:bg-[#f97316]/20 hover:border-[#f97316]/40'
              )}
            >
              {cloning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {cloning ? 'Cloning...' : 'Use Template'}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
