'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy,
  Send,
  BookOpen,
  HelpCircle,
  Users,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  Bot,
  AlertCircle,
  Ticket,
  Clock,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import type { Ticket as TicketType, Agent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────

type Category = 'general' | 'billing' | 'technical' | 'feature_request' | 'bug_report';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// ─── Quick Links ─────────────────────────────────────────────

const QUICK_LINKS = [
  {
    icon: BookOpen,
    label: 'Documentation',
    description: 'Browse guides and API reference',
    href: 'https://docs.hatcher.host',
    external: true,
  },
  {
    icon: HelpCircle,
    label: 'FAQ',
    description: 'Common questions answered',
    href: '/help',
    external: false,
  },
  {
    icon: Users,
    label: 'Follow Us',
    description: 'Updates and announcements',
    href: 'https://x.com/HatcherLabs',
    external: true,
  },
];

// ─── Stagger animation variants ─────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ─── Custom Select Component ────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/20 transition-colors cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function SupportPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [priority, setPriority] = useState<Priority>('normal');
  const [agentId, setAgentId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Tickets + agents state
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const MESSAGE_MAX = 5000;
  const SUBJECT_MAX = 200;

  // Fetch tickets and agents on auth
  useEffect(() => {
    if (!isAuthenticated) return;
    setTicketsLoading(true);
    Promise.all([api.getTickets(), api.getMyAgents()])
      .then(([ticketRes, agentRes]) => {
        if (ticketRes.success) setTickets(ticketRes.data);
        if (agentRes.success) setAgents(agentRes.data);
      })
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, [isAuthenticated]);

  function resetForm() {
    setSubject('');
    setCategory('general');
    setPriority('normal');
    setAgentId('');
    setMessage('');
    setFormError('');
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isAuthenticated) {
      setFormError('Please sign in to submit a ticket.');
      return;
    }

    // Validate
    if (!subject.trim()) {
      setFormError('Subject is required.');
      return;
    }
    if (subject.length > SUBJECT_MAX) {
      setFormError(`Subject must be under ${SUBJECT_MAX} characters.`);
      return;
    }
    if (!message.trim()) {
      setFormError('Message is required.');
      return;
    }
    if (message.length > MESSAGE_MAX) {
      setFormError(`Message must be under ${MESSAGE_MAX} characters.`);
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        agentId: agentId || undefined,
      });
      if (res.success) {
        setSubmitted(true);
        toast('success', 'Ticket submitted successfully');
        // Refresh tickets list
        const ticketRes = await api.getTickets();
        if (ticketRes.success) setTickets(ticketRes.data);
      } else {
        setFormError(res.error || 'Failed to submit ticket');
      }
    } catch {
      setFormError('Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <motion.div
        className="max-w-3xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Page Header ─────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.12)' }}
            >
              <LifeBuoy size={20} className="text-[#06b6d4]" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Support
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Get help with your agents, billing, or anything else
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Quick Links ─────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => {
            const LinkIcon = link.icon;
            const Wrapper = link.external ? 'a' : Link;
            const extraProps = link.external
              ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
              : { href: link.href };

            return (
              <Wrapper
                key={link.label}
                {...(extraProps as any)}
                className="group flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl p-4 transition-all duration-200 hover:border-[#06b6d4]/30 hover:bg-[var(--bg-card)] hover:-translate-y-[3px]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: 'rgba(6,182,212,0.1)' }}
                >
                  <LinkIcon size={18} className="text-[#06b6d4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#06b6d4] transition-colors">
                      {link.label}
                    </span>
                    {link.external && (
                      <ExternalLink size={12} className="text-[var(--text-muted)] group-hover:text-[#06b6d4]/60 transition-colors" />
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{link.description}</span>
                </div>
              </Wrapper>
            );
          })}
        </motion.div>

        {/* ─── Direct Contact ──────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl p-5">
            <p className="text-sm text-[var(--text-secondary)]">
              Or email us directly at{' '}
              <a href="mailto:support@hatcher.host" className="text-[#06b6d4] hover:underline font-medium">
                support@hatcher.host
              </a>
              {' '}&middot;{' '}
              <a
                href="https://discord.gg/7tY3HjKjMc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06b6d4] hover:underline font-medium"
              >
                Join our Discord
              </a>{' '}&middot;{' '}
              <a
                href="https://t.me/HatcherLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06b6d4] hover:underline font-medium"
              >
                Telegram
              </a>{' '}
              for community support
            </p>
          </div>
        </motion.div>

        {/* ─── Ticket Form / Success State ─────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-2.5 px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
              <Send size={16} className="text-[#06b6d4]" />
              <h2
                className="text-base font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Submit a Ticket
              </h2>
            </div>

            <div className="p-6">
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--text-secondary)] mb-4">Sign in to submit a support ticket.</p>
                  <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
                    Sign In
                  </Link>
                </div>
              ) : (
              <AnimatePresence mode="wait">
                {submitted ? (
                  /* ─── Success State ─────────────────────────── */
                  <motion.div
                    key="success"
                    className="flex flex-col items-center py-10 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: 'easeOut' as const }}
                  >
                    {/* Animated check icon */}
                    <motion.div
                      className="relative mb-5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'radial-gradient(circle, rgba(74,222,128,0.2) 0%, transparent 70%)',
                          transform: 'scale(2)',
                        }}
                      />
                      <div
                        className="relative w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: 'rgba(74,222,128,0.12)',
                          border: '1px solid rgba(74,222,128,0.25)',
                          boxShadow: '0 0 24px rgba(74,222,128,0.15)',
                        }}
                      >
                        <CheckCircle2 size={32} className="text-[#4ADE80]" />
                      </div>
                    </motion.div>

                    <motion.h3
                      className="text-lg font-semibold text-[var(--text-primary)] mb-2"
                      style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Ticket Submitted
                    </motion.h3>
                    <motion.p
                      className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      We have received your request and will get back to you shortly.
                      You will be notified when there is an update.
                    </motion.p>
                    <motion.button
                      onClick={resetForm}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 hover:bg-[var(--bg-card)]"
                      style={{
                        color: 'var(--text-secondary)',
                        borderColor: 'rgba(46,43,74,0.6)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      Submit Another Ticket
                    </motion.button>
                  </motion.div>
                ) : (
                  /* ─── Form ──────────────────────────────────── */
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Error banner */}
                    <AnimatePresence>
                      {formError && (
                        <motion.div
                          className="flex items-center gap-2 p-3 rounded-xl"
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
                          <span className="text-sm text-[#F87171]">{formError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                        Subject <span className="text-[#F87171]">*</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => {
                          if (e.target.value.length <= SUBJECT_MAX) {
                            setSubject(e.target.value);
                          }
                        }}
                        placeholder="Brief description of your issue"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/20 transition-colors"
                        maxLength={SUBJECT_MAX}
                      />
                      <div className="flex justify-end mt-1">
                        <span className={`text-[11px] ${subject.length > SUBJECT_MAX * 0.9 ? 'text-[#FBBF24]' : 'text-[var(--text-muted)]'}`}>
                          {subject.length}/{SUBJECT_MAX}
                        </span>
                      </div>
                    </div>

                    {/* Category & Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField
                        label="Category"
                        value={category}
                        onChange={(val) => setCategory(val as Category)}
                        options={CATEGORIES}
                      />
                      <SelectField
                        label="Priority"
                        value={priority}
                        onChange={(val) => setPriority(val as Priority)}
                        options={PRIORITIES}
                      />
                    </div>

                    {/* Agent selector (optional) */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                        Related Agent <span className="text-[var(--text-muted)] normal-case tracking-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <select
                          value={agentId}
                          onChange={(e) => setAgentId(e.target.value)}
                          className="w-full appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/20 transition-colors cursor-pointer"
                        >
                          <option value="">Select an agent...</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.status})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                          <Bot size={14} className="text-[var(--text-muted)]" />
                          <ChevronDown size={16} className="text-[var(--text-muted)]" />
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                        Message <span className="text-[#F87171]">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => {
                          if (e.target.value.length <= MESSAGE_MAX) {
                            setMessage(e.target.value);
                          }
                        }}
                        placeholder="Describe your issue in detail..."
                        rows={6}
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/20 transition-colors resize-y min-h-[120px]"
                        maxLength={MESSAGE_MAX}
                      />
                      <div className="flex justify-end mt-1">
                        <span className={`text-[11px] ${message.length > MESSAGE_MAX * 0.9 ? 'text-[#FBBF24]' : 'text-[var(--text-muted)]'}`}>
                          {message.length}/{MESSAGE_MAX.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                        style={{
                          background: submitting ? 'rgba(6,182,212,0.7)' : '#06b6d4',
                          boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
                        }}
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send size={15} />
                            Submit Ticket
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Recent Tickets ──────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
              <Ticket size={16} className="text-[#06b6d4]" />
              <h2
                className="text-base font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Recent Tickets
              </h2>
              {tickets.length > 0 && (
                <span className="ml-auto text-xs font-medium text-[var(--text-muted)]">
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="p-0">
              {ticketsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-8 h-8 rounded-lg shimmer flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-48 rounded shimmer" />
                        <div className="h-3 w-24 rounded shimmer" />
                      </div>
                      <div className="h-5 w-16 rounded-full shimmer" />
                    </div>
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={LifeBuoy}
                  title="No tickets yet"
                  description="Your submitted support tickets will appear here. Create your first ticket above to get started."
                  actionLabel="Back to Top"
                  actionHref="#"
                />
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {tickets.map((ticket) => {
                    const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
                      open: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
                      in_progress: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: MessageSquare },
                      resolved: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
                      closed: { color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-elevated)]', icon: XCircle },
                    };
                    const sc = statusConfig[ticket.status] ?? statusConfig.open;
                    const StatusIcon = sc.icon;
                    return (
                      <Link
                        key={ticket.id}
                        href={`/support/${ticket.id}`}
                        className="flex items-center gap-3 px-6 py-4 transition-all duration-200 hover:bg-[var(--bg-card)] hover:-translate-y-[2px] group"
                      >
                        <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                          <StatusIcon size={14} className={sc.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[#06b6d4] transition-colors">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {ticket.category.replace('_', ' ')}
                            </span>
                            {ticket.agent && (
                              <>
                                <span className="text-[var(--text-muted)]">&middot;</span>
                                <span className="text-[11px] text-[var(--text-muted)]">{ticket.agent.name}</span>
                              </>
                            )}
                            <span className="text-[var(--text-muted)]">&middot;</span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} border-current/20 capitalize`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
