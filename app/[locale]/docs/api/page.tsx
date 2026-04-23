'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  BookOpen,
  ChevronDown,
  Copy,
  Check,
  Shield,
  Zap,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Server,
  MessageSquare,
  Power,
  User,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Animation variants ─────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Code tab component ──────────────────────────────────────────

type Lang = 'curl' | 'javascript' | 'python';

function CodeTabs({ examples }: { examples: Record<Lang, string> }) {
  const [active, setActive] = useState<Lang>('curl');
  const [copied, setCopied] = useState(false);

  const labels: Record<Lang, string> = { curl: 'cURL', javascript: 'JavaScript', python: 'Python' };

  function handleCopy() {
    navigator.clipboard.writeText(examples[active]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-1">
        <div className="flex">
          {(Object.keys(examples) as Lang[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setActive(lang)}
              className={cn(
                'px-4 py-2.5 text-xs font-medium transition-all duration-200',
                active === lang
                  ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {labels[lang]}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="mr-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-all duration-200"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 text-sm leading-relaxed overflow-x-auto font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
        <code>{examples[active]}</code>
      </pre>
    </div>
  );
}

// ── Method badge ────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-500/15 text-green-400 border-green-500/25',
    POST: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/25',
    PUT: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    PATCH: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/25',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border', colors[method] || 'bg-gray-500/15 text-gray-400')}>
      {method}
    </span>
  );
}

// ── Endpoint card ───────────────────────────────────────────────

interface EndpointProps {
  method: string;
  path: string;
  description: string;
  body?: string;
  response: string;
  examples: Record<Lang, string>;
}

function EndpointCard({ method, path, description, body, response, examples }: EndpointProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[rgba(6,182,212,0.3)] shadow-[0_0_16px_rgba(6,182,212,0.06)]'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left group"
      >
        <MethodBadge method={method} />
        <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-primary)] flex-1 truncate">
          {path}
        </span>
        <span className="hidden sm:block text-xs text-[var(--text-muted)] mr-2 flex-shrink-0 max-w-[200px] truncate">
          {description}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[var(--color-accent)]/15' : 'bg-[var(--bg-card)]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-colors', open ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]')} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(6,182,212,0.2)] to-transparent" />

              <p className="text-sm text-[var(--text-secondary)]">{description}</p>

              {body && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Request Body</p>
                  <pre className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-xs font-[family-name:var(--font-mono)] text-[var(--text-secondary)] overflow-x-auto">
                    <code>{body}</code>
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Response</p>
                <pre className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-xs font-[family-name:var(--font-mono)] text-[var(--text-secondary)] overflow-x-auto">
                  <code>{response}</code>
                </pre>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Example</p>
                <CodeTabs examples={examples} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Endpoint data ───────────────────────────────────────────────

const ENDPOINT_GROUPS = [
  {
    title: 'Agents',
    icon: Server,
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/agents',
        description: 'List all your agents with their current status and configuration.',
        response: `{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "CryptoSage",
      "slug": "cryptosage-x4f2",
      "status": "active",
      "framework": "openclaw",
      "createdAt": "2026-03-15T10:30:00Z"
    }
  ]
}`,
        examples: {
          curl: `curl -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents', {
  headers: { 'Authorization': 'Bearer hk_your_api_key' }
});
const { data } = await res.json();`,
          python: `import requests

res = requests.get('https://api.hatcher.host/api/v1/agents',
    headers={'Authorization': 'Bearer hk_your_api_key'})
data = res.json()['data']`,
        },
      },
      {
        method: 'GET',
        path: '/api/v1/agents/:id',
        description: 'Get detailed information about a specific agent, including full configuration.',
        response: `{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "name": "CryptoSage",
    "slug": "cryptosage-x4f2",
    "status": "active",
    "framework": "openclaw",
    "description": "Crypto trading analyst",
    "config": { ... },
    "features": ["openclaw.platform.telegram"],
    "createdAt": "2026-03-15T10:30:00Z"
  }
}`,
        examples: {
          curl: `curl -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents/a1b2c3d4-...`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents/a1b2c3d4-...', {
  headers: { 'Authorization': 'Bearer hk_your_api_key' }
});
const { data } = await res.json();`,
          python: `import requests

res = requests.get('https://api.hatcher.host/api/v1/agents/a1b2c3d4-...',
    headers={'Authorization': 'Bearer hk_your_api_key'})
agent = res.json()['data']`,
        },
      },
      {
        method: 'GET',
        path: '/api/v1/agents/:id/status',
        description: 'Quick status check for an agent. Returns status, uptime, and last activity.',
        response: `{
  "success": true,
  "data": {
    "status": "active",
    "uptime": 259200,
    "lastActivity": "2026-03-20T14:23:00Z",
    "messagesTotal": 1247
  }
}`,
        examples: {
          curl: `curl -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../status`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../status', {
  headers: { 'Authorization': 'Bearer hk_your_api_key' }
});
const { data } = await res.json();
console.log(data.status); // "active"`,
          python: `import requests

res = requests.get('https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../status',
    headers={'Authorization': 'Bearer hk_your_api_key'})
status = res.json()['data']['status']`,
        },
      },
    ],
  },
  {
    title: 'Chat',
    icon: MessageSquare,
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/agents/:id/chat',
        description: 'Send a message to an agent and receive a response. Supports conversation history.',
        body: `{
  "message": "What is the current SOL price trend?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}`,
        response: `{
  "success": true,
  "data": {
    "content": "SOL is currently trading at $142.50...",
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "tokensUsed": { "input": 85, "output": 234 }
  }
}`,
        examples: {
          curl: `curl -X POST \\
  -H "Authorization: Bearer hk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "What is the current SOL price trend?"}' \\
  https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../chat`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer hk_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What is the current SOL price trend?',
    history: [],
  }),
});
const { data } = await res.json();
console.log(data.content);`,
          python: `import requests

res = requests.post(
    'https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../chat',
    headers={'Authorization': 'Bearer hk_your_api_key'},
    json={
        'message': 'What is the current SOL price trend?',
        'history': []
    }
)
reply = res.json()['data']['content']`,
        },
      },
    ],
  },
  {
    title: 'Lifecycle',
    icon: Power,
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/agents/:id/start',
        description: 'Start an agent. Validates features and provisions a container. Takes up to 60 seconds.',
        response: `{
  "success": true,
  "data": {
    "status": "starting",
    "message": "Agent is being provisioned..."
  }
}`,
        examples: {
          curl: `curl -X POST \\
  -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../start`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../start', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer hk_your_api_key' },
});
const { data } = await res.json();`,
          python: `import requests

res = requests.post(
    'https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../start',
    headers={'Authorization': 'Bearer hk_your_api_key'}
)
print(res.json()['data']['status'])`,
        },
      },
      {
        method: 'POST',
        path: '/api/v1/agents/:id/stop',
        description: 'Stop a running agent. Container is removed but configuration is preserved.',
        response: `{
  "success": true,
  "data": {
    "status": "stopped",
    "message": "Agent stopped successfully"
  }
}`,
        examples: {
          curl: `curl -X POST \\
  -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../stop`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../stop', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer hk_your_api_key' },
});`,
          python: `import requests

res = requests.post(
    'https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../stop',
    headers={'Authorization': 'Bearer hk_your_api_key'}
)`,
        },
      },
      {
        method: 'POST',
        path: '/api/v1/agents/:id/restart',
        description: 'Restart an agent. Stops the current container and starts a new one with the latest configuration.',
        response: `{
  "success": true,
  "data": {
    "status": "restarting",
    "message": "Agent is restarting..."
  }
}`,
        examples: {
          curl: `curl -X POST \\
  -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../restart`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../restart', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer hk_your_api_key' },
});`,
          python: `import requests

res = requests.post(
    'https://api.hatcher.host/api/v1/agents/a1b2c3d4-.../restart',
    headers={'Authorization': 'Bearer hk_your_api_key'}
)`,
        },
      },
    ],
  },
  {
    title: 'Account',
    icon: User,
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/me',
        description: 'Get your account information, including wallet address, agent count, and active features.',
        response: `{
  "success": true,
  "data": {
    "id": "u1b2c3d4-...",
    "walletAddress": "7xKXtg...AsU",
    "agentCount": 3,
    "maxAgents": 5,
    "hatchCredits": 12.50,
    "createdAt": "2026-02-01T00:00:00Z"
  }
}`,
        examples: {
          curl: `curl -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/me`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/me', {
  headers: { 'Authorization': 'Bearer hk_your_api_key' }
});
const { data } = await res.json();`,
          python: `import requests

res = requests.get('https://api.hatcher.host/api/v1/me',
    headers={'Authorization': 'Bearer hk_your_api_key'})
account = res.json()['data']`,
        },
      },
      {
        method: 'GET',
        path: '/api/v1/usage',
        description: 'Get your API usage statistics for the current billing period.',
        response: `{
  "success": true,
  "data": {
    "period": "2026-03",
    "requestsUsed": 847,
    "requestsLimit": 10000,
    "tokensUsed": { "input": 45230, "output": 128450 },
    "creditsRemaining": 8.25
  }
}`,
        examples: {
          curl: `curl -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/usage`,
          javascript: `const res = await fetch('https://api.hatcher.host/api/v1/usage', {
  headers: { 'Authorization': 'Bearer hk_your_api_key' }
});
const { data } = await res.json();
console.log(\`\${data.requestsUsed}/\${data.requestsLimit} requests used\`);`,
          python: `import requests

res = requests.get('https://api.hatcher.host/api/v1/usage',
    headers={'Authorization': 'Bearer hk_your_api_key'})
usage = res.json()['data']
print(f"{usage['requestsUsed']}/{usage['requestsLimit']} requests used")`,
        },
      },
    ],
  },
];

const RATE_LIMIT_TIERS = [
  { tier: 'Free', requests: '100', price: '$0' },
  { tier: 'Starter', requests: '10,000', price: '$6.99/mo' },
  { tier: 'Pro', requests: '100,000', price: '$19.99/mo' },
  { tier: 'Business', requests: '500,000', price: '$49.99/mo' },
];

const ERROR_CODES = [
  { code: 'AUTH_REQUIRED', http: '401', description: 'Missing or invalid API key' },
  { code: 'FORBIDDEN', http: '403', description: 'Not authorized for this resource' },
  { code: 'NOT_FOUND', http: '404', description: 'Agent or resource not found' },
  { code: 'RATE_LIMIT_EXCEEDED', http: '429', description: 'Daily API limit reached' },
  { code: 'VALIDATION_ERROR', http: '400', description: 'Invalid request body or parameters' },
  { code: 'AGENT_NOT_RUNNING', http: '409', description: 'Agent must be running for this action' },
  { code: 'SERVER_ERROR', http: '500', description: 'Internal server error' },
];

// ── Page ────────────────────────────────────────────────────────

export default function ApiReferencePage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">

        {/* ── Back link ─────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            Back to Docs
          </Link>
        </motion.div>

        {/* ── Hero ───────────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-1.5 text-sm font-medium text-[var(--color-accent)]">
            <BookOpen className="h-4 w-4" />
            v1
          </div>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            API Reference
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
            Integrate your Hatcher agents into any application. Manage agents, send messages, and monitor status programmatically.
          </p>
        </motion.div>

        {/* ── Authentication ─────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-10">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                <Shield size={16} className="text-[var(--color-accent)]" />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Authentication
              </h2>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              All API requests require authentication using your platform API key. Include it in
              the <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--color-accent)] font-[family-name:var(--font-mono)] text-xs">Authorization</code> header
              as a Bearer token.
            </p>

            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 mb-4">
              <code className="text-sm font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                Authorization: Bearer <span className="text-[var(--color-accent)]">hk_your_api_key</span>
              </code>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              You can find and regenerate your API key on the{' '}
              <Link href="/settings" className="text-[var(--color-accent)] hover:underline underline-offset-2 decoration-[var(--color-accent)]/30">
                Settings page
              </Link>
              . Keys are prefixed with <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--color-accent)] font-[family-name:var(--font-mono)] text-xs">hk_</code> for easy identification.
            </p>

            <CodeTabs
              examples={{
                curl: `curl -H "Authorization: Bearer hk_your_api_key" \\
  https://api.hatcher.host/api/v1/agents`,
                javascript: `const res = await fetch('https://api.hatcher.host/api/v1/agents', {
  headers: { 'Authorization': 'Bearer hk_your_api_key' }
});
const { data } = await res.json();`,
                python: `import requests

res = requests.get('https://api.hatcher.host/api/v1/agents',
    headers={'Authorization': 'Bearer hk_your_api_key'})
data = res.json()['data']`,
              }}
            />

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Never expose your API key in client-side code or public repositories.
                Use environment variables and server-side requests to keep your key safe.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Rate Limits ────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-10">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                <Zap size={16} className="text-[var(--color-accent)]" />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Rate Limits
              </h2>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              API usage is rate-limited per day based on your plan. Rate limit information is included
              in every response header.
            </p>

            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Tier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Requests / Day</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_LIMIT_TIERS.map((tier, i) => (
                    <tr key={tier.tier} className={cn('border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card)]', i === RATE_LIMIT_TIERS.length - 1 && 'border-b-0')}>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{tier.tier}</td>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">{tier.requests}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{tier.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
              Check the following response headers to monitor your usage:
            </p>

            <div className="space-y-1.5">
              {[
                { header: 'X-RateLimit-Limit', desc: 'Your daily request limit' },
                { header: 'X-RateLimit-Remaining', desc: 'Requests remaining today' },
                { header: 'X-RateLimit-Reset', desc: 'UTC timestamp when the limit resets' },
              ].map((h) => (
                <div key={h.header} className="flex items-center gap-3 text-sm">
                  <code className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--color-accent)] font-[family-name:var(--font-mono)] text-xs flex-shrink-0">
                    {h.header}
                  </code>
                  <span className="text-[var(--text-muted)]">{h.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Endpoints ──────────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-10 space-y-8"
        >
          {ENDPOINT_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <motion.div key={group.title} variants={staggerItem}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                    <Icon size={16} className="text-[var(--color-accent)]" />
                  </div>
                  <h2
                    className="text-lg font-semibold text-[var(--text-primary)]"
                    style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                  >
                    {group.title}
                  </h2>
                </div>
                <div className="space-y-2">
                  {group.endpoints.map((ep) => (
                    <EndpointCard key={ep.path + ep.method} {...ep} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Response Format ────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-10">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                <BarChart3 size={16} className="text-[var(--color-accent)]" />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Response Format
              </h2>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              All API responses follow a consistent JSON structure. Successful responses include
              a <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-green-400 font-[family-name:var(--font-mono)] text-xs">data</code> field.
              Error responses include <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-red-400 font-[family-name:var(--font-mono)] text-xs">error</code> and <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-red-400 font-[family-name:var(--font-mono)] text-xs">code</code> fields.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Success</p>
                <pre className="p-3 rounded-lg bg-[var(--bg-base)] border border-green-500/15 text-xs font-[family-name:var(--font-mono)] text-[var(--text-secondary)] overflow-x-auto">
                  <code>{`{
  "success": true,
  "data": { ... }
}`}</code>
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Error</p>
                <pre className="p-3 rounded-lg bg-[var(--bg-base)] border border-red-500/15 text-xs font-[family-name:var(--font-mono)] text-[var(--text-secondary)] overflow-x-auto">
                  <code>{`{
  "success": false,
  "error": "Not found",
  "code": "NOT_FOUND"
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Error Codes ────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-10">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Lock size={16} className="text-red-400" />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Error Codes
              </h2>
            </div>

            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">HTTP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map((err, i) => (
                    <tr key={err.code} className={cn('border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card)]', i === ERROR_CODES.length - 1 && 'border-b-0')}>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-accent)]">{err.code}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border',
                          err.http === '401' || err.http === '403' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                          err.http === '404' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' :
                          err.http === '429' ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' :
                          err.http === '400' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/25' :
                          err.http === '409' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                          'bg-red-500/15 text-red-400 border-red-500/25'
                        )}>
                          {err.http}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{err.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* ── Help CTA ───────────────────────────────────────── */}
        <motion.div variants={cardVariants}>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Need help integrating? Check out the platform-specific guides.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/docs/integrations"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all duration-200 hover:bg-[#0891b2] hover:shadow-[var(--color-accent)]/30"
              >
                Integration Guides
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--color-accent)]/30 hover:text-[var(--text-primary)]"
              >
                All Documentation
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
