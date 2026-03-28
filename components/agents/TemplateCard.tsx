'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, ChevronUp, MessageSquare, X, Send, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────

export interface TemplateCardData {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  personality: string;
  defaultBio?: string;
  defaultTopics?: readonly string[];
  defaultSystemPrompt?: string;
  // Optional enrichment (provided by consumer)
  features?: string[];
  integrations?: string[];
  sampleConversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
  badge?: string; // e.g. "Popular", "New"
  framework?: 'openclaw' | 'hermes' | 'elizaos' | 'milady';
}

interface TemplateCardProps {
  template: TemplateCardData;
  onUse: (id: string) => void;
  selected?: boolean;
}

// ── Category colour map ────────────────────────────────────

const CATEGORY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  business:    { border: 'border-cyan-500/40',    bg: 'bg-cyan-500/10',    text: 'text-cyan-400' },
  development: { border: 'border-purple-500/40',  bg: 'bg-purple-500/10',  text: 'text-purple-400' },
  crypto:      { border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  research:    { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  support:     { border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  general:     { border: 'border-[rgba(46,43,74,0.4)]', bg: 'bg-[rgba(26,23,48,0.6)]', text: 'text-[#A5A1C2]' },
  custom:      { border: 'border-[rgba(46,43,74,0.4)]', bg: 'bg-[rgba(26,23,48,0.6)]', text: 'text-[#A5A1C2]' },
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
}

// ── Preview Modal ─────────────────────────────────────────

function PreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: TemplateCardData;
  onClose: () => void;
  onUse: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    template.sampleConversation ?? []
  );
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const features = template.features ?? template.defaultTopics?.slice(0, 4) ?? [];
  const integrations = template.integrations ?? ['Telegram', 'Discord', 'Web Chat'];
  const colors = getCategoryColors(template.category);

  async function sendMessage() {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    // Simulate a response based on the template's persona
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    const preview = generatePreviewResponse(template, userMsg);
    setMessages(prev => [...prev, { role: 'assistant', content: preview }]);
    setIsTyping(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f]/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="card glass-noise w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[rgba(46,43,74,0.3)]">
          <div className="flex items-center gap-4">
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0', colors.bg, 'border', colors.border)}>
              {template.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{template.name}</h2>
              <p className="text-sm text-[#A5A1C2] mt-0.5">{template.description}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize', colors.bg, colors.border, colors.text)}>
                  {template.category}
                </span>
                {template.framework && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold capitalize">
                    {template.framework}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: features + chat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Features + integrations row */}
          <div className="grid grid-cols-2 gap-4">
            {features.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider mb-2">Capabilities</p>
                <ul className="space-y-1">
                  {features.slice(0, 4).map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#A5A1C2]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] flex-shrink-0" />
                      <span className="capitalize">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {integrations.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider mb-2">Works With</p>
                <div className="flex flex-wrap gap-1.5">
                  {integrations.map(i => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] border border-[rgba(46,43,74,0.4)] text-[#A5A1C2]">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sample conversation */}
          <div>
            <p className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider mb-3">
              Live Preview
            </p>
            <div className="bg-[rgba(10,10,15,0.6)] border border-[rgba(46,43,74,0.3)] rounded-xl p-4 space-y-3 min-h-[160px] max-h-[260px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {messages.length === 0 && !isTyping && (
                <p className="text-xs text-[#71717a] text-center py-8">
                  Ask anything to preview how this agent responds
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2.5',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5', colors.bg)}>
                      {template.icon}
                    </div>
                  )}
                  <div
                    className={cn(
                      'text-xs rounded-xl px-3 py-2 max-w-[80%] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[#06b6d4]/15 text-white border border-[#06b6d4]/20'
                        : 'bg-[rgba(26,23,48,0.8)] text-[#A5A1C2] border border-[rgba(46,43,74,0.4)]'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2.5 justify-start">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5', colors.bg)}>
                    {template.icon}
                  </div>
                  <div className="bg-[rgba(26,23,48,0.8)] border border-[rgba(46,43,74,0.4)] rounded-xl px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#A5A1C2]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={`Ask ${template.name} something...`}
                className="flex-1 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#71717a] outline-none focus:border-[#06b6d4]/50 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-xl bg-[#06b6d4]/15 border border-[#06b6d4]/30 flex items-center justify-center text-[#06b6d4] hover:bg-[#06b6d4]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-[rgba(46,43,74,0.3)] flex items-center justify-between gap-3">
          <p className="text-xs text-[#71717a]">
            Deploy in under 2 minutes — free tier available
          </p>
          <button
            onClick={() => { onClose(); onUse(template.id); }}
            className="btn-primary text-sm gap-2"
          >
            <Zap size={14} />
            Use This Template
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Preview response generator ────────────────────────────

function generatePreviewResponse(template: TemplateCardData, userMsg: string): string {
  const name = template.name;
  const topics = template.defaultTopics ?? [];
  const personality = template.personality ?? '';

  // Generic fallback responses based on template category
  const responses: Record<string, string[]> = {
    business: [
      `Great question! As your ${name}, I can help with that. Based on best practices, I'd recommend starting with a clear strategy and measurable goals.`,
      `I can definitely assist with that. Let me break it down: first, we should analyze your current situation, then identify opportunities, and finally create an action plan.`,
    ],
    development: [
      `Sure! Here's how I'd approach this from a technical perspective. First, let's make sure we understand the requirements clearly before diving into implementation.`,
      `That's a common challenge. Here's a clean solution: consider using a modular approach that separates concerns and makes future changes easier.`,
    ],
    crypto: [
      `Based on current market conditions, there are a few important factors to consider. Remember to always do your own research and never invest more than you can afford to lose.`,
      `Interesting timing for this question. Let me share some on-chain data points that might help inform your decision.`,
    ],
    research: [
      `I found several relevant sources on this topic. Let me summarize the key findings: the consensus in recent literature suggests a multi-faceted approach is most effective.`,
      `Good research question. Here are the main points to consider, with citations from reputable sources.`,
    ],
    support: [
      `I'm here to help! Let me look into that for you. Can you tell me a bit more about when this started happening?`,
      `Thank you for reaching out. I understand how frustrating this can be. Let's resolve this together — here are the steps we'll take.`,
    ],
    general: [
      `Happy to help with that! Based on what you've shared, here's my recommendation...`,
      `Great question. Let me give you a thorough answer.`,
    ],
  };

  const categoryResponses = responses[template.category] ?? responses.general;
  const baseResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

  // Personalize if topics available
  if (topics.length > 0) {
    const topic = topics[Math.floor(Math.random() * Math.min(3, topics.length))];
    return `${baseResponse}\n\nThis relates to my expertise in **${topic}** — ${personality.toLowerCase() ? `I approach this in a ${personality.toLowerCase()} way.` : 'let me know if you need more detail.'}`;
  }

  return baseResponse;
}

// ── Main TemplateCard Component ───────────────────────────

export function TemplateCard({ template, onUse, selected = false }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const features = template.features ?? template.defaultTopics?.slice(0, 3) ?? [];
  const integrations = template.integrations ?? ['Telegram', 'Discord', 'Web Chat'];
  const colors = getCategoryColors(template.category);

  return (
    <>
      <motion.div
        layout
        className={cn(
          'card glass-noise flex flex-col gap-0 overflow-hidden transition-all duration-200 group',
          selected && 'ring-1 ring-[#06b6d4]/50 shadow-[0_0_24px_rgba(6,182,212,0.12)]'
        )}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        {/* Badge */}
        {template.badge && (
          <div className="px-4 pt-3 pb-0">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06b6d4]/15 border border-[#06b6d4]/30 text-[#06b6d4] font-semibold">
              {template.badge}
            </span>
          </div>
        )}

        {/* Card body */}
        <div className="p-4 flex-1">
          {/* Icon + name + category */}
          <div className="flex items-start gap-3 mb-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0', colors.bg, 'border', colors.border)}>
              {template.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-[#06b6d4] transition-colors">
                {template.name}
              </h3>
              <p className="text-xs text-[#A5A1C2] mt-0.5 line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            </div>
          </div>

          {/* Topics / features */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {features.map(f => (
                <span
                  key={f}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] capitalize"
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Expandable: integrations + personality */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-[rgba(46,43,74,0.3)] space-y-2.5">
                  <div>
                    <p className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-1">Works With</p>
                    <div className="flex flex-wrap gap-1">
                      {integrations.map(i => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] border border-[rgba(46,43,74,0.4)] text-[#A5A1C2]">
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                  {template.personality && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-1">Personality</p>
                      <p className="text-xs text-[#A5A1C2]">{template.personality}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[#71717a] hover:text-[#A5A1C2] transition-colors mt-2"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Less' : 'More details'}
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center gap-2 border-t border-[rgba(46,43,74,0.3)] pt-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:text-white hover:border-[rgba(46,43,74,0.7)] bg-[rgba(26,23,48,0.4)] hover:bg-[rgba(26,23,48,0.7)] transition-all duration-150"
          >
            <MessageSquare size={12} />
            Preview
          </button>
          <button
            onClick={() => onUse(template.id)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/20 hover:border-[#06b6d4]/50 transition-all duration-150 font-medium"
          >
            Use
            <ArrowRight size={12} />
          </button>
        </div>
      </motion.div>

      {/* Preview modal */}
      <AnimatePresence>
        {showPreview && (
          <PreviewModal
            template={template}
            onClose={() => setShowPreview(false)}
            onUse={onUse}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default TemplateCard;
