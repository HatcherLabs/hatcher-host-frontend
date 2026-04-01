import Link from 'next/link';
import {
  Bot,
  Zap,
  Shield,
  Star,
  ArrowRight,
  Brain,
  Globe,
  Sparkles,
  Check,
  Code,
  MessageCircle,
  Rocket,
} from 'lucide-react';

export const metadata = {
  title: 'Claymorphism Design Exploration — Hatcher',
  description: 'Internal design exploration: claymorphism UI utilities for Hatcher',
  robots: 'noindex, nofollow',
};

export default function ClayDemoPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-8 md:p-16">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* Header */}
        <div>
          <div className="clay-badge-primary mb-4">HAT-87 · Internal Design Exploration</div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Claymorphism for Hatcher
          </h1>
          <p className="text-text-secondary text-lg">
            Prototype of clay-style components adapted to our dark purple/cyan brand. Soft shadows, inset highlights, inflated depth.
          </p>
        </div>

        {/* Buttons */}
        <section className="space-y-6">
          <SectionTitle>Buttons</SectionTitle>
          <div className="flex flex-wrap gap-4 items-center">
            <button className="clay-btn-primary clay-btn-lg">
              <Rocket size={18} />
              Deploy Agent
            </button>
            <button className="clay-btn-accent clay-btn-lg">
              <Zap size={18} />
              Get Started Free
            </button>
            <button className="clay-btn-primary">
              <Bot size={16} />
              New Agent
            </button>
            <button className="clay-btn-accent">
              <ArrowRight size={16} />
              Learn More
            </button>
          </div>
          <p className="text-text-muted text-sm">
            Classes: <code className="text-primary-400">.clay-btn-primary</code>, <code className="text-primary-400">.clay-btn-accent</code>, <code className="text-accent-400">.clay-btn-lg</code>
          </p>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <SectionTitle>Badges &amp; Pills</SectionTitle>
          <div className="flex flex-wrap gap-3">
            <span className="clay-badge-primary"><Star size={12} /> Popular</span>
            <span className="clay-badge-primary"><Zap size={12} /> Pro</span>
            <span className="clay-badge-primary"><Shield size={12} /> Secure</span>
            <span className="clay-badge-accent"><Globe size={12} /> Live</span>
            <span className="clay-badge-accent"><Check size={12} /> Verified</span>
            <span className="clay-badge-accent"><Sparkles size={12} /> New</span>
          </div>
          <p className="text-text-muted text-sm">
            Classes: <code className="text-primary-400">.clay-badge-primary</code>, <code className="text-accent-400">.clay-badge-accent</code>
          </p>
        </section>

        {/* Icon containers */}
        <section className="space-y-6">
          <SectionTitle>Icon Containers</SectionTitle>
          <div className="flex flex-wrap gap-4">
            <div className="clay-icon-primary"><Bot size={22} /></div>
            <div className="clay-icon-primary"><Brain size={22} /></div>
            <div className="clay-icon-primary"><Shield size={22} /></div>
            <div className="clay-icon-primary"><Code size={22} /></div>
            <div className="clay-icon-accent"><Zap size={22} /></div>
            <div className="clay-icon-accent"><Globe size={22} /></div>
            <div className="clay-icon-accent"><MessageCircle size={22} /></div>
            <div className="clay-icon-accent"><Sparkles size={22} /></div>
          </div>
          <p className="text-text-muted text-sm">
            Classes: <code className="text-primary-400">.clay-icon-primary</code>, <code className="text-accent-400">.clay-icon-accent</code>
          </p>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <SectionTitle>Cards</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Neutral clay card */}
            <div className="clay p-6 space-y-4 transition-all duration-300">
              <div className="clay-icon-primary">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">My Agent</h3>
                <p className="text-text-muted text-sm">OpenClaw · Running</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success text-xs font-medium">Active</span>
              </div>
            </div>

            {/* Primary clay card */}
            <div className="clay-primary p-6 space-y-4 transition-all duration-300">
              <div className="clay-icon-primary">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Pro Plan</h3>
                <p className="text-text-muted text-sm">3 agents · $14.99/mo</p>
              </div>
              <button className="clay-btn-primary text-sm w-full justify-center">
                Upgrade
              </button>
            </div>

            {/* Accent clay card */}
            <div className="clay-accent p-6 space-y-4 transition-all duration-300">
              <div className="clay-icon-accent">
                <Zap size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Quick Deploy</h3>
                <p className="text-text-muted text-sm">One-click from template</p>
              </div>
              <button className="clay-btn-accent text-sm w-full justify-center">
                Deploy Now
              </button>
            </div>
          </div>
          <p className="text-text-muted text-sm">
            Classes: <code className="text-text-secondary">.clay</code>, <code className="text-primary-400">.clay-primary</code>, <code className="text-accent-400">.clay-accent</code>
          </p>
        </section>

        {/* Feature cards grid — landing page use case */}
        <section className="space-y-6">
          <SectionTitle>Feature Cards (Landing Page Use Case)</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: Bot, label: 'Deploy in seconds', desc: 'Pick a framework, configure, launch. No infrastructure knowledge required.', variant: 'primary' as const },
              { icon: Brain, label: 'BYOK support', desc: 'Bring your own OpenAI, Anthropic, or Groq key for unlimited messages.', variant: 'accent' as const },
              { icon: Shield, label: 'Isolated containers', desc: 'Each agent runs in its own Docker container with resource limits.', variant: 'primary' as const },
              { icon: Globe, label: 'All platforms', desc: 'Telegram, Discord, Twitter, WhatsApp, Slack — user provides tokens.', variant: 'accent' as const },
            ].map(({ icon: Icon, label, desc, variant }) => (
              <div key={label} className={`${variant === 'primary' ? 'clay-primary' : 'clay-accent'} p-6 flex gap-4 transition-all duration-300 group`}>
                <div className={variant === 'primary' ? 'clay-icon-primary flex-shrink-0' : 'clay-icon-accent flex-shrink-0'}>
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">{label}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Input */}
        <section className="space-y-6">
          <SectionTitle>Input Field</SectionTitle>
          <div className="max-w-sm space-y-3">
            <input className="clay-input" placeholder="Enter agent name..." />
            <input className="clay-input" placeholder="Your API key..." type="password" />
          </div>
          <p className="text-text-muted text-sm">
            Class: <code className="text-text-secondary">.clay-input</code>
          </p>
        </section>

        {/* Hero CTA preview — how it would look on landing page */}
        <section className="space-y-6">
          <SectionTitle>Hero CTA Preview</SectionTitle>
          <div className="clay p-10 text-center space-y-6 max-w-2xl mx-auto">
            <span className="clay-badge-primary">
              <Sparkles size={12} />
              Managed AI Agent Hosting
            </span>
            <h2 className="text-3xl font-bold">
              Deploy Your Agent{' '}
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                in One Click
              </span>
            </h2>
            <p className="text-text-secondary">
              Pick a framework, configure, and run. No DevOps required.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className="clay-btn-primary clay-btn-lg">
                <Rocket size={18} />
                Deploy Free Agent
              </button>
              <button className="clay-btn-accent clay-btn-lg">
                <ArrowRight size={18} />
                View Demo
              </button>
            </div>
          </div>
        </section>

        {/* Comparison with existing */}
        <section className="space-y-6">
          <SectionTitle>Side-by-Side: Current vs Clay</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-text-muted text-sm mb-3">Current style</p>
              <div className="space-y-3">
                <button className="btn-primary w-full">Deploy Agent</button>
                <button className="btn-cta w-full">Get Started Free</button>
                <div className="card p-5">
                  <p className="font-medium">Standard card</p>
                  <p className="text-text-muted text-sm">Glassmorphism / flat style</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-text-muted text-sm mb-3">Clay style</p>
              <div className="space-y-3">
                <button className="clay-btn-primary w-full justify-center">Deploy Agent</button>
                <button className="clay-btn-accent w-full justify-center">Get Started Free</button>
                <div className="clay p-5">
                  <p className="font-medium">Clay card</p>
                  <p className="text-text-muted text-sm">Multi-layer shadow / depth</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proposal */}
        <section className="clay-primary p-8 space-y-4 rounded-2xl">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Sparkles className="text-primary-400" size={20} />
            Implementation Proposal
          </h2>
          <div className="space-y-2 text-text-secondary text-sm leading-relaxed">
            <p><strong className="text-text-primary">Recommended approach:</strong> Apply clay style selectively — don&apos;t replace the entire design system.</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong className="text-text-primary">Hero CTAs</strong> — clay-btn-primary/accent for the top landing page buttons (highest impact, most visible)</li>
              <li><strong className="text-text-primary">Pricing cards</strong> — clay-primary for the Pro tier card (makes it feel premium/elevated)</li>
              <li><strong className="text-text-primary">Framework cards</strong> on the Create page — clay with icon containers</li>
              <li><strong className="text-text-primary">Feature grid</strong> on landing page — clay-primary/accent alternating cards</li>
              <li><strong className="text-text-primary">Dashboard agent cards</strong> — subtle clay for the agent tiles</li>
            </ul>
            <p className="pt-2"><strong className="text-text-primary">What to keep flat:</strong> Navigation, sidebar, tables, forms (except inputs), modal backgrounds. Clay works for &quot;card&quot; surfaces and CTAs, not chrome.</p>
            <p><strong className="text-text-primary">Risk:</strong> On mobile, heavy box shadows can hurt performance. Need to test with Lighthouse before any production rollout.</p>
          </div>
        </section>

        <div className="flex gap-3 pb-16">
          <Link href="/" className="clay-btn-primary">
            <ArrowRight size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted border-b border-[var(--border-default)] pb-2">
      {children}
    </h2>
  );
}
