'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  LifeBuoy,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Ticket } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { timeAgo } from '@/lib/utils';

type TicketDetail = Ticket;

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
  open: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
  in_progress: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: MessageSquare },
  resolved: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !ticketId) return;
    setLoading(true);
    api.getTicket(ticketId).then((res) => {
      setLoading(false);
      if (res.success) setTicket(res.data);
      else setError(res.error);
    });
  }, [isAuthenticated, ticketId]);

  async function handleReply() {
    if (!replyText.trim() || !ticketId) return;
    setReplying(true);
    const res = await api.replyToTicket(ticketId, replyText.trim());
    setReplying(false);
    if (res.success) {
      setReplyText('');
      // Refresh ticket
      const refresh = await api.getTicket(ticketId);
      if (refresh.success) setTicket(refresh.data);
    }
  }

  async function handleClose() {
    if (!ticketId) return;
    const res = await api.closeTicket(ticketId);
    if (res.success) {
      const refresh = await api.getTicket(ticketId);
      if (refresh.success) setTicket(refresh.data);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <LifeBuoy size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-secondary)]">Sign in to view this ticket.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Ticket Not Found</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{error ?? 'This ticket does not exist or you do not have access.'}</p>
          <Link href="/support" className="btn-primary px-6 py-2.5 text-sm">
            Back to Support
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusConfig[ticket.status] ?? statusConfig.open;
  const StatusIcon = sc.icon;

  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Support
        </Link>

        {/* Ticket header */}
        <div className="card glass-noise p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">{ticket.subject}</h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                <span>&middot;</span>
                <span className="capitalize">{ticket.priority} priority</span>
                {ticket.agent && (
                  <>
                    <span>&middot;</span>
                    <span>Agent: {ticket.agent.name}</span>
                  </>
                )}
                <span>&middot;</span>
                <span>Created {timeAgo(ticket.createdAt)}</span>
              </div>
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${sc.bg} ${sc.color} border-current/20 capitalize`}>
              <StatusIcon size={12} />
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3">
          {ticket.messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`card glass-noise p-5 ${(msg.role as string) === 'admin' ? 'border-l-2 border-l-[#f97316]' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold ${(msg.role as string) === 'admin' ? 'text-[#f97316]' : 'text-[var(--text-muted)]'}`}>
                  {(msg.role as string) === 'admin' ? 'Hatcher Team' : 'You'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo((msg as any).timestamp ?? msg.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </motion.div>
          ))}
        </div>

        {/* Reply form (only if not closed) */}
        {ticket.status !== 'resolved' && (
          <div className="card glass-noise p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-[#f97316]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Reply</span>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="w-full bg-[#252240] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20 transition-colors resize-y mb-3"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={handleClose}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                Mark as resolved
              </button>
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || replying}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors disabled:opacity-50"
              >
                {replying ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Send Reply
              </button>
            </div>
          </div>
        )}

        {/* Resolved message */}
        {ticket.status === 'resolved' && (
          <div className="card glass-noise p-5 text-center border border-green-500/20">
            <CheckCircle2 size={24} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-green-400">This ticket has been resolved.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
