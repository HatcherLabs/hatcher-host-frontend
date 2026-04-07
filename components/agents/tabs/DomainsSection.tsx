'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { useAgentContext, GlassCard, Skeleton } from '../AgentContext';
import { api } from '@/lib/api';

interface CustomDomain {
  id: string;
  agentId: string;
  domain: string;
  verified: boolean;
  sslStatus: string;
  cnameTarget: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ verified, sslStatus }: { verified: boolean; sslStatus: string }) {
  if (verified && sslStatus === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle size={10} />
        Active
      </span>
    );
  }
  if (sslStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertTriangle size={10} />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock size={10} />
      Pending
    </span>
  );
}

export function DomainsSection() {
  const { agent } = useAgentContext();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const res = await api.getMyDomains();
      if (res.success) {
        setDomains(res.data.filter((d) => d.agentId === agent.id));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [agent.id]);

  const handleAdd = async () => {
    if (!domainInput.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api.addCustomDomain(agent.id, domainInput.trim().toLowerCase());
      if (res.success) {
        setDomains((prev) => [res.data, ...prev]);
        setDomainInput('');
        setShowForm(false);
      } else {
        setError(res.error || 'Failed to add domain');
      }
    } catch {
      setError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifying(id);
    setVerifyMsg((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await api.verifyDomain(id);
      if (res.success) {
        if (res.data.verified) {
          setVerifyMsg((prev) => ({ ...prev, [id]: 'Domain verified successfully!' }));
          // Refresh domains to get updated status
          loadDomains();
        } else {
          setVerifyMsg((prev) => ({
            ...prev,
            [id]: res.data.message || 'Verification failed. Check your DNS settings.',
          }));
        }
      } else {
        setVerifyMsg((prev) => ({ ...prev, [id]: res.error || 'Verification failed' }));
      }
    } catch {
      setVerifyMsg((prev) => ({ ...prev, [id]: 'Network error' }));
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this custom domain?')) return;
    setDeleting(id);
    try {
      const res = await api.deleteDomain(id);
      if (res.success) {
        setDomains((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
          Custom Domains
          <span className="ml-2 text-violet-400 normal-case tracking-normal font-normal">Public Chat Access</span>
        </h3>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
        Custom Domains
        <span className="ml-2 text-violet-400 normal-case tracking-normal font-normal">Public Chat Access</span>
      </h3>

      <div className="space-y-3">
        {/* Existing domains */}
        {domains.map((domain) => (
          <GlassCard key={domain.id} className={`!p-0 ${domain.verified ? 'border-emerald-500/20' : ''}`}>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={14} className={domain.verified ? 'text-emerald-400' : 'text-[var(--text-muted)]'} />
                  <span className="text-sm font-medium text-white">{domain.domain}</span>
                  <StatusBadge verified={domain.verified} sslStatus={domain.sslStatus} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVerify(domain.id)}
                    disabled={verifying === domain.id}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-40"
                    title="Verify DNS"
                  >
                    {verifying === domain.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(domain.id)}
                    disabled={deleting === domain.id}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Remove domain"
                  >
                    {deleting === domain.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* CNAME instructions */}
              <div className="p-3 rounded-lg bg-black/30 border border-[var(--border-default)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-[var(--text-muted)]">
                  DNS Configuration
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Point <span className="text-white font-mono">{domain.domain}</span> CNAME to:
                    </p>
                    <p className="text-sm font-mono text-[var(--color-accent)] mt-1 truncate">{domain.cnameTarget}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(domain.cnameTarget, domain.id)}
                    className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-card)] transition-colors"
                    title="Copy CNAME target"
                  >
                    {copiedId === domain.id ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} className="text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Verify message */}
              {verifyMsg[domain.id] && (
                <p className={`text-xs ${verifyMsg[domain.id]?.includes('successfully') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {verifyMsg[domain.id]}
                </p>
              )}
            </div>
          </GlassCard>
        ))}

        {/* Add domain form */}
        {showForm ? (
          <GlassCard className="!p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Add Custom Domain</p>
                <button
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="p-1 rounded hover:bg-[var(--bg-card)] transition-colors"
                >
                  <X size={14} className="text-[var(--text-muted)]" />
                </button>
              </div>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="chat.yourdomain.com"
                className="w-full h-9 px-3 rounded-lg text-sm text-white bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none placeholder:text-[var(--text-muted)] transition-colors font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !domainInput.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-[var(--color-accent)] hover:bg-[#0891b2] disabled:opacity-40 transition-colors"
                >
                  {adding ? 'Adding...' : 'Add Domain'}
                </button>
                <p className="text-[10px] text-[var(--text-muted)]">
                  You will need to configure a CNAME record after adding.
                </p>
              </div>
            </div>
          </GlassCard>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)] transition-all"
          >
            <Plus size={14} />
            Add Custom Domain
          </button>
        )}

        {/* Help text */}
        {domains.length === 0 && !showForm && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-2">
            Add a custom domain so users can chat with your agent at your own URL.
          </p>
        )}
      </div>
    </div>
  );
}
