'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/lib/auth-context';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import {
  api,
  Agent,
  Ticket,
  TicketMessage,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from '@/lib/api';
import {
  LifeBuoy,
  Plus,
  ArrowLeft,
  Send,
  Clock,
  Tag,
  AlertCircle,
  Bot,
  Zap,
  MessageSquare,
  X,
} from 'lucide-react';

import { timeAgo } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────

const STATUS_STYLES: Record<TicketStatus, { bg: string; text: string; label: string }> = {
  open:        { bg: 'rgba(249,115,22,0.15)', text: 'rgb(167,139,250)',  label: 'Open' },
  in_progress: { bg: 'rgba(245,158,11,0.15)', text: 'rgb(251,191,36)',  label: 'In Progress' },
  resolved:    { bg: 'rgba(34,197,94,0.15)',   text: 'rgb(74,222,128)',  label: 'Resolved' },
  closed:      { bg: 'rgba(156,163,175,0.15)', text: 'rgb(156,163,175)', label: 'Closed' },
};

const CATEGORY_STYLES: Record<TicketCategory, { bg: string; text: string; label: string }> = {
  general:         { bg: 'rgba(156,163,175,0.15)', text: 'rgb(156,163,175)', label: 'General' },
  billing:         { bg: 'rgba(245,158,11,0.15)',  text: 'rgb(251,191,36)',  label: 'Billing' },
  technical:       { bg: 'rgba(96,165,250,0.15)',  text: 'rgb(96,165,250)',  label: 'Technical' },
  feature_request: { bg: 'rgba(249,115,22,0.15)',  text: 'rgb(167,139,250)', label: 'Feature Request' },
  bug_report:      { bg: 'rgba(239,68,68,0.15)',   text: 'rgb(248,113,113)', label: 'Bug Report' },
};

const PRIORITY_STYLES: Record<TicketPriority, { bg: string; text: string; label: string }> = {
  low:    { bg: 'rgba(156,163,175,0.15)', text: 'rgb(156,163,175)', label: 'Low' },
  normal: { bg: 'rgba(96,165,250,0.15)',  text: 'rgb(96,165,250)',  label: 'Normal' },
  high:   { bg: 'rgba(245,158,11,0.15)',  text: 'rgb(251,191,36)',  label: 'High' },
  urgent: { bg: 'rgba(239,68,68,0.15)',   text: 'rgb(248,113,113)', label: 'Urgent' },
};

function Badge({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card glass-noise p-6 ${className}`}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function SupportPage() {
  const { connected } = useWallet();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // New ticket form state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('general');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [newAgentId, setNewAgentId] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const res = await api.getTickets();
    if (res.success) {
      setTickets(res.data);
    }
    setLoading(false);
  }, []);

  const fetchAgents = useCallback(async () => {
    const res = await api.getMyAgents();
    if (res.success) {
      setAgents(res.data);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
      fetchAgents();
    }
  }, [isAuthenticated, fetchTickets, fetchAgents]);

  // ─── Auth gates ─────────────────────────────────────────────

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(249,115,22,0.15)' }}
          >
            <Bot size={40} className="text-[#f97316]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Connect Your Wallet</h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Connect a Solana wallet to access support.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(249,115,22,0.15)' }}
          >
            <Zap size={40} className="text-[#f97316]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Sign a message with your wallet to access support.
          </p>
          <button className="btn-primary px-8 py-3" onClick={login}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ─── Handlers ───────────────────────────────────────────────

  async function handleCreateTicket() {
    if (!newSubject.trim() || !newMessage.trim()) {
      setFormError('Subject and message are required.');
      return;
    }
    setFormError('');
    setCreating(true);
    const res = await api.createTicket({
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      agentId: newAgentId || undefined,
      message: newMessage.trim(),
    });
    setCreating(false);
    if (res.success) {
      setShowNewTicketModal(false);
      setNewSubject('');
      setNewCategory('general');
      setNewPriority('normal');
      setNewAgentId('');
      setNewMessage('');
      fetchTickets();
    } else {
      setFormError(res.error || 'Failed to create ticket.');
    }
  }

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    const res = await api.replyToTicket(selectedTicket.id, replyText.trim());
    setReplying(false);
    if (res.success) {
      setReplyText('');
      // Refresh the ticket detail
      const updated = await api.getTicket(selectedTicket.id);
      if (updated.success) {
        setSelectedTicket(updated.data);
        // Update in list too
        setTickets((prev) =>
          prev.map((t) => (t.id === updated.data.id ? updated.data : t))
        );
      }
    }
  }

  async function handleCloseTicket() {
    if (!selectedTicket) return;
    const res = await api.closeTicket(selectedTicket.id);
    if (res.success) {
      setSelectedTicket(res.data);
      setTickets((prev) =>
        prev.map((t) => (t.id === res.data.id ? res.data : t))
      );
    }
  }

  async function handleSelectTicket(ticket: Ticket) {
    // Fetch full ticket with messages
    const res = await api.getTicket(ticket.id);
    if (res.success) {
      setSelectedTicket(res.data);
    } else {
      setSelectedTicket(ticket);
    }
  }

  // ─── Ticket Detail View ─────────────────────────────────────

  if (selectedTicket) {
    const status = STATUS_STYLES[selectedTicket.status];
    const category = CATEGORY_STYLES[selectedTicket.category];
    const priority = PRIORITY_STYLES[selectedTicket.priority];
    const messages = selectedTicket.messages ?? [];

    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back button */}
          <button
            onClick={() => { setSelectedTicket(null); setReplyText(''); }}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            Back to tickets
          </button>

          {/* Ticket header */}
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  {selectedTicket.subject}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge {...category} />
                  <Badge {...priority} />
                  <Badge {...status} />
                  {selectedTicket.agent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-[var(--text-muted)]">
                      <Bot size={12} />
                      {selectedTicket.agent.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <Clock size={12} />
                  {timeAgo(selectedTicket.createdAt)}
                </span>
                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={handleCloseTicket}
                    className="btn-danger text-xs px-3 py-1.5"
                  >
                    Close Ticket
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Messages thread */}
          <div className="space-y-3">
            {messages.map((msg: TicketMessage) => (
              <GlassCard key={msg.id} className={msg.role === 'support' ? '!border-l-2 !border-l-[#f97316]/50' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: msg.role === 'support' ? 'rgb(167,139,250)' : 'var(--text-primary)' }}
                  >
                    {msg.role === 'support' ? 'Support' : 'You'}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock size={10} />
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {msg.content}
                </p>
              </GlassCard>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                No messages yet.
              </div>
            )}
          </div>

          {/* Reply box */}
          {selectedTicket.status !== 'closed' && (
            <GlassCard>
              <div className="flex items-center gap-2.5 mb-4">
                <MessageSquare size={18} className="text-[var(--accent-600)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Reply</h2>
              </div>
              <textarea
                className="input w-full min-h-[100px] resize-y mb-3"
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleReply}
                  disabled={replying || !replyText.trim()}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {replying ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    );
  }

  // ─── Ticket List View ───────────────────────────────────────

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Support</h1>
            <p className="text-sm mt-1 text-[var(--text-secondary)]">
              Create and manage support tickets
            </p>
          </div>
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            New Ticket
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--text-secondary)]">Loading tickets...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && tickets.length === 0 && (
          <GlassCard className="!py-16">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(249,115,22,0.15)' }}
              >
                <LifeBuoy size={32} className="text-[#f97316]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                No tickets yet
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Need help? Create a support ticket and we will get back to you.
              </p>
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="btn-primary flex items-center gap-2 text-sm mx-auto"
              >
                <Plus size={16} />
                Create Your First Ticket
              </button>
            </div>
          </GlassCard>
        )}

        {/* Ticket list */}
        {!loading && tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const status = STATUS_STYLES[ticket.status];
              const category = CATEGORY_STYLES[ticket.category];
              const priority = PRIORITY_STYLES[ticket.priority];
              return (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className="card glass-noise p-4 w-full text-left transition-colors hover:bg-white/[0.03] cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-2">
                        {ticket.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge {...category} />
                        <Badge {...priority} />
                        <Badge {...status} />
                        {ticket.agent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-[var(--text-muted)]">
                            <Bot size={12} />
                            {ticket.agent.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo(ticket.createdAt)}
                      </span>
                      <MessageSquare size={14} className="text-[var(--text-muted)]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewTicketModal(false);
          }}
        >
          <div className="card glass-noise p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <LifeBuoy size={18} className="text-[var(--accent-600)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  New Support Ticket
                </h2>
              </div>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="btn-ghost p-1.5 rounded-lg"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-400">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="section-label block mb-2">Subject</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Brief description of your issue"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>

              {/* Category & Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label block mb-2">Category</label>
                  <select
                    className="input w-full"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="bug_report">Bug Report</option>
                  </select>
                </div>
                <div>
                  <label className="section-label block mb-2">Priority</label>
                  <select
                    className="input w-full"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Agent (optional) */}
              <div>
                <label className="section-label block mb-2">
                  Related Agent <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <select
                  className="input w-full"
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                >
                  <option value="">None</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="section-label block mb-2">Message</label>
                <textarea
                  className="input w-full min-h-[120px] resize-y"
                  placeholder="Describe your issue in detail..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={creating}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {creating ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
