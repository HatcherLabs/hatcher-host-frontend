'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { shortenAddress, timeAgo } from '@/lib/utils';


interface AdminTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userUsername: string;
  userEmail: string;
  userWallet: string | null;
  agentName: string | null;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  resolved: 'text-green-400 bg-green-500/10 border-green-500/20',
};

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const [ticket, setTicket] = useState<AdminTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !ticketId) return;
    setLoading(true);
    api.adminGetTickets().then((res) => {
      setLoading(false);
      if (res.success) {
        const t = ((res.data as any).tickets ?? []).find((t: AdminTicket) => t.id === ticketId);
        if (t) setTicket(t);
        else setError('Ticket not found');
      } else {
        setError((res as any).error);
      }
    });
  }, [isAuthenticated, isAdmin, ticketId]);

  async function handleReply() {
    if (!replyText.trim() || !ticketId) return;
    setReplying(true);
    const res = await api.adminReplyTicket(ticketId, replyText.trim());
    setReplying(false);
    if (res.success) {
      setReplyText('');
      // Refresh
      const refresh = await api.adminGetTickets();
      if (refresh.success) {
        const t = ((refresh.data as any).tickets ?? []).find((t: AdminTicket) => t.id === ticketId);
        if (t) setTicket(t);
      }
    } else {
      alert(`Reply failed: ${(res as any).error}`);
    }
  }

  async function handleStatusChange(status: string) {
    if (!ticketId) return;
    const res = await api.adminUpdateTicketStatus(ticketId, status);
    if (res.success && ticket) {
      setTicket({ ...ticket, status });
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#06b6d4] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
          <p className="text-[var(--text-primary)] font-bold mb-2">Access Denied</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Ticket Not Found</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{error ?? 'Could not load this ticket.'}</p>
          <Link href="/admin" className="btn-primary px-6 py-2.5 text-sm">Back to Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={16} />
          Back to Admin
        </Link>

        {/* Header */}
        <div className="card glass-noise p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">{ticket.subject}</h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                <span className="font-medium">{ticket.userUsername}</span>
                <span className="text-[var(--text-muted)] ml-1">({ticket.userEmail})</span>
                <span>&middot;</span>
                <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                <span>&middot;</span>
                <span className="capitalize">{ticket.priority} priority</span>
                {ticket.agentName && (
                  <>
                    <span>&middot;</span>
                    <span>Agent: {ticket.agentName}</span>
                  </>
                )}
                <span>&middot;</span>
                <span>{timeAgo(ticket.createdAt)}</span>
              </div>
            </div>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize cursor-pointer ${statusColors[ticket.status] ?? statusColors.open}`}
              style={{ background: 'transparent' }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3">
          {ticket.messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`card glass-noise p-5 ${msg.role === 'admin' ? 'border-l-2 border-l-[#06b6d4]' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold ${msg.role === 'admin' ? 'text-[#06b6d4]' : 'text-[var(--text-muted)]'}`}>
                  {msg.role === 'admin' ? 'Admin' : 'User'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(msg.timestamp)}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </motion.div>
          ))}
        </div>

        {/* Reply form */}
        {ticket.status !== 'resolved' && (
          <div className="card glass-noise p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-[#06b6d4]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Admin Reply</span>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply to the user..."
              rows={3}
              className="w-full bg-[#252240] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/20 transition-colors resize-y mb-3"
            />
            <div className="flex justify-end">
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || replying}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#06b6d4] hover:bg-[#0891b2] transition-colors disabled:opacity-50"
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
      </div>
    </motion.div>
  );
}
