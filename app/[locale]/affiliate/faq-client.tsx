'use client';

// ============================================================
// /affiliate FAQ accordion — client sub-component
// ============================================================
// Split out from the server-rendered marketing page so the rest
// of the page stays static-friendly. 4 required FAQs from the
// spec; add more by extending the FAQS array.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How is attribution done?',
    a: 'Link-based. When someone clicks your /r/CODE link we drop a 30-day first-touch `hx_ref` cookie on their browser. When they register, the cookie locks the attribution to your affiliate record — and it\'s permanent for the lifetime of that user\'s account. We never overwrite an existing attribution, so accidental second clicks don\'t hijack someone else\'s referral.',
  },
  {
    q: 'When do payouts happen?',
    a: 'Manual for now — an admin reviews pending commissions monthly and settles cash (SOL / USDC / $HATCHER) + applies credits in the same pass. Every commission has a 30-day hold window before it becomes payable; that matches the Stripe refund window and lets us void commissions cleanly if the underlying payment gets refunded.',
  },
  {
    q: 'Can I change my payout mode?',
    a: 'Yes, but not self-service yet. Contact support@hatcher.host (or ping us on Telegram / Discord) and we\'ll update your affiliate record. Past commissions stay under the mode they accrued under — the change applies to new commissions only.',
  },
  {
    q: 'What counts as fraud?',
    a: 'Self-referrals (signing up under your own code), obvious IP address matches between the affiliate and the referred user, incentivized-click traffic, and fake-account farms. We freeze affiliate accounts caught doing any of those — frozen affiliates can appeal, but frozen status voids all pending commissions and blocks new ones.',
  },
  {
    q: 'Do I have to use Hatcher myself to be an affiliate?',
    a: 'No. You can sign up for a free Hatcher account just to get your referral link and never deploy anything. That said — if you\'re going to pitch Hatcher, shipping at least one agent makes your content hit harder.',
  },
  {
    q: 'What exactly counts as a commissionable payment?',
    a: 'Every paid tier subscription (Starter, Pro, Business), every addon renewal, and the one-time Founding Member purchase. Credits grants and free-tier usage earn nothing. BYOK messages also earn nothing since they don\'t generate revenue for Hatcher.',
  },
];

export function AffiliateFAQ() {
  return (
    <div className="space-y-3">
      {FAQS.map((item) => (
        <FAQItem key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`card glass-noise overflow-hidden transition-all duration-200 ${
        open ? 'border-[rgba(6,182,212,0.3)]' : ''
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[var(--color-accent)] transition-colors">
          {q}
        </span>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            open ? 'bg-[var(--color-accent)]/15' : 'bg-[var(--bg-card)]'
          }`}
        >
          <ChevronDown
            className={`w-4 h-4 transition-all duration-200 ${
              open ? 'text-[var(--color-accent)] rotate-180' : 'text-[var(--text-muted)]'
            }`}
          />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(6,182,212,0.2)] to-transparent mb-4" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
