'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Check, Twitter, MessageCircle, Code2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentSlug: string;
}

export function ShareModal({ isOpen, onClose, agentName, agentSlug }: ShareModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hatcher.host';
  const agentUrl = `${baseUrl}/a/${agentSlug}`;
  const embedUrl = `${baseUrl}/embed/${agentSlug}`;
  const embedCode = `<iframe src="${embedUrl}" width="400" height="600" style="border:none;border-radius:12px;" allow="microphone"></iframe>`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Check out ${agentName} — an AI agent on @haborhost ${agentUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareDiscord = () => {
    copy(agentUrl, 'link');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-lg font-semibold text-white">Share {agentName}</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-[var(--text-primary)] transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Agent Link */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Agent Link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={agentUrl}
                  className="flex-1 bg-zinc-900 border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono"
                />
                <button
                  onClick={() => copy(agentUrl, 'link')}
                  className="shrink-0 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors flex items-center gap-1.5"
                >
                  {copied === 'link' ? <Check size={14} /> : <Link2 size={14} />}
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Social Share */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Share on</label>
              <div className="flex gap-3">
                <button
                  onClick={shareTwitter}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 border border-[var(--border-default)] hover:border-[var(--border-hover)] text-zinc-300 hover:text-[var(--text-primary)] text-sm transition-all"
                >
                  <Twitter size={16} />
                  Twitter
                </button>
                <button
                  onClick={shareDiscord}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 border border-[var(--border-default)] hover:border-[var(--border-hover)] text-zinc-300 hover:text-[var(--text-primary)] text-sm transition-all"
                >
                  <MessageCircle size={16} />
                  Discord
                </button>
              </div>
            </div>

            {/* Embed Code */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Embed Code</label>
              <div className="relative">
                <pre className="bg-zinc-900 border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-zinc-400 font-mono overflow-x-auto">
                  {embedCode}
                </pre>
                <button
                  onClick={() => copy(embedCode, 'embed')}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                >
                  {copied === 'embed' ? <Check size={12} /> : <Code2 size={12} />}
                  {copied === 'embed' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
