'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Eye,
  Github,
  Layers,
  Mail,
  Map,
  Network,
  Play,
  Smartphone,
  Terminal,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import styles from './page.module.css';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=host.hatcher.app';
const SOLANA_MOBILE_URL = 'https://solanamobile.com/';
const RoomAvatarPreview = dynamic(() => import('./RoomAvatarPreview'), {
  ssr: false,
  loading: () => <div className={styles.roomAvatarLoading} />,
});

type Tone = 'green' | 'cyan' | 'amber' | 'rose' | 'violet' | 'blue';
type Visual =
  | 'email'
  | 'city'
  | 'room'
  | 'eyes'
  | 'skills'
  | 'cli'
  | 'mobile'
  | 'github'
  | 'a2a'
  | 'models'
  | 'wallets';

interface Feature {
  id: Visual;
  kicker: string;
  title: string;
  short: string;
  detail: string;
  bullets: string[];
  icon: LucideIcon;
  tone: Tone;
}

const FEATURES: Feature[] = [
  {
    id: 'email',
    kicker: 'Operations',
    title: 'Agent email and inbox',
    short: 'Give every agent a real operational inbox.',
    detail:
      'Agents can receive inbound work, summarize conversations, draft replies, prepare files, and keep recurring follow-ups moving. This makes an agent useful outside the dashboard: it can react to email, keep context, and return with a finished task.',
    bullets: [
      'Inbound requests',
      'Draft replies',
      'File handoffs',
      'Daily follow-ups',
    ],
    icon: Mail,
    tone: 'green',
  },
  {
    id: 'city',
    kicker: 'Spatial ops',
    title: '3D Hatcher City',
    short: 'A walkable map of live agents and buildings.',
    detail:
      'Hatcher City turns agents into a visible operating network. Users can move through the city, find live agents, enter buildings, and inspect the agent rooms behind each deployed worker.',
    bullets: [
      'Live city map',
      'Agent buildings',
      'Public discovery',
      'Fast room entry',
    ],
    icon: Map,
    tone: 'cyan',
  },
  {
    id: 'room',
    kicker: 'Agent workspace',
    title: '3D rooms and buildings',
    short: 'Each agent gets a dedicated room with controls.',
    detail:
      'Rooms are the owner workspace for an agent. Chat, avatar controls, model settings, files, terminal, wallet, stats, logs, and integrations live together so the user understands what the agent is doing without hunting across pages.',
    bullets: [
      'Chat sessions',
      'Avatar selector',
      'Runtime logs',
      'Wallet and files',
    ],
    icon: Building2,
    tone: 'amber',
  },
  {
    id: 'eyes',
    kicker: 'Computer use',
    title: 'Eyes visual workspace',
    short: 'Watch agent browser work as a live screen feed.',
    detail:
      'Eyes gives agents an opt-in visual workspace for browser and desktop tasks. Owners can see a live PIP preview in the room, start or stop capture, and keep visual work transparent instead of relying only on text logs.',
    bullets: [
      'Live screen preview',
      '1 focused PIP by default',
      'Browser actions',
      'Owner visibility',
    ],
    icon: Eye,
    tone: 'blue',
  },
  {
    id: 'skills',
    kicker: 'Tools',
    title: 'Agent skills',
    short: 'Web, files, code, schedules, integrations, and partner tools.',
    detail:
      'Hatcher agents can use framework skills and platform tools through one managed runtime. Skills can cover web research, file operations, scheduled work, external integrations, wallet actions, partner compute, and domain-specific workflows.',
    bullets: ['Web and files', 'Schedules', 'Integrations', 'Partner compute'],
    icon: Wrench,
    tone: 'rose',
  },
  {
    id: 'cli',
    kicker: 'Developer',
    title: 'Hatcher CLI',
    short: 'Create, chat, and operate agents from the terminal.',
    detail:
      'Install the CLI, generate an owner API key, run `hatcher`, and manage agents without opening the browser. The CLI supports agent lists, creation, chat, terminal attachment, and owner workflows for developers who live in a shell.',
    bullets: [
      'npm i @hatcherlabs/cli',
      'Owner API keys',
      'Agent chat',
      'Live terminal',
    ],
    icon: Terminal,
    tone: 'violet',
  },
  {
    id: 'mobile',
    kicker: 'Mobile',
    title: 'Android and Solana Mobile',
    short: 'Hatcher in your pocket, with app-store surfaces.',
    detail:
      'The mobile experience gives users a compact way to monitor agents, open city entry points, jump into rooms, and chat with running workers. Hatcher is available through Google Play and prepared for Solana Mobile distribution.',
    bullets: [
      'Google Play',
      'Solana Mobile',
      'Agent overview',
      'Room entry points',
    ],
    icon: Smartphone,
    tone: 'blue',
  },
  {
    id: 'github',
    kicker: 'Code',
    title: 'GitHub workflows',
    short: 'Connect repositories and give agents scoped repo access.',
    detail:
      'Owners can connect GitHub, choose which repositories agents may access, and set a default repo for development work. Agents can inspect code, summarize changes, prepare fixes, and collaborate with the owner from chat or terminal.',
    bullets: [
      'GitHub OAuth',
      'Repo allowlist',
      'Default repo',
      'Code-aware agents',
    ],
    icon: Github,
    tone: 'green',
  },
  {
    id: 'a2a',
    kicker: 'Coordination',
    title: 'Agent-to-agent communication',
    short: 'Agents can route tasks to other agents under the same owner.',
    detail:
      'A2A lets one agent ask another agent for help, send a task, or coordinate a workflow. This supports research teams, monitoring agents, code assistants, and multi-agent operations without exposing private owner controls publicly.',
    bullets: [
      'Task delegation',
      'Owner-scoped routing',
      'Async replies',
      'Workflow handoffs',
    ],
    icon: Network,
    tone: 'cyan',
  },
  {
    id: 'models',
    kicker: 'Inference',
    title: 'Model and provider control',
    short: 'Use hosted models, IDLE models, BYOK, and presets.',
    detail:
      'The model selector gives users a clearer view of providers, costs, privacy posture, context windows, strengths, and active presets. Hatcher can route through UsePod/OpenRouter, IDLE Haiku/Sonnet, Xiaomi MiMo launch-promo models, AceData partner models, or BYOK providers.',
    bullets: ['Provider table', 'Model presets', 'BYOK', 'AI Credit metering'],
    icon: Layers,
    tone: 'amber',
  },
  {
    id: 'wallets',
    kicker: 'Wallets',
    title: 'Agent wallets',
    short: 'Solana, Base, and SKALE wallet surfaces per agent.',
    detail:
      'Agents have wallet surfaces for balances, receiving funds, QR codes, runtime access, and supported transaction workflows. Owners can inspect the state and decide what autonomy they want each agent to have.',
    bullets: [
      'Solana wallet',
      'Base wallet',
      'SKALE identity',
      'QR and balances',
    ],
    icon: WalletCards,
    tone: 'violet',
  },
];

const SURFACES = [
  'Web dashboard',
  'Public webchat',
  'Agent terminal',
  '3D city',
  '3D building',
  '3D room',
  'Android app',
  'Solana Mobile',
  'Hatcher CLI',
];

export default function FeaturesPage() {
  const [activeId, setActiveId] = useState<Visual>('email');
  const active = useMemo(
    () => FEATURES.find((feature) => feature.id === activeId) ?? FEATURES[0],
    [activeId],
  );

  return (
    <MarketingShell>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Hatcher features</p>
            <h1>Everything your agents need after launch.</h1>
            <p className={styles.heroText}>
              Hatcher is the control plane for hosted OpenClaw and Hermes
              agents: chat, terminal, skills, email, wallets, 3D spaces, mobile
              access, GitHub workflows, and agent-to-agent coordination.
            </p>
            <div className={styles.actions}>
              <Link href="/create" className={styles.primaryAction}>
                Hatch an agent
                <ArrowRight aria-hidden />
              </Link>
              <Link href="/pricing" className={styles.secondaryAction}>
                View pricing
              </Link>
            </div>
            <div className={styles.surfaceList} aria-label="Hatcher surfaces">
              {SURFACES.map((surface) => (
                <span key={surface}>{surface}</span>
              ))}
            </div>
          </div>

          <StorePhone />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Core product</p>
            <h2>Explore the feature system.</h2>
            <p>
              Each feature is designed as part of the same agent operating
              surface: create the agent, give it tools, let it work across
              channels, and return to inspect or steer it.
            </p>
          </div>

          <div className={styles.explorer}>
            <div className={styles.featureNav} aria-label="Feature selector">
              {FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className={`${styles.featureButton} ${active.id === feature.id ? styles.activeFeature : ''}`}
                  onClick={() => setActiveId(feature.id)}
                  aria-pressed={active.id === feature.id}
                >
                  <feature.icon aria-hidden />
                  <span>
                    <small>{feature.kicker}</small>
                    {feature.title}
                  </span>
                </button>
              ))}
            </div>

            <article
              className={`${styles.featureDetail} ${styles[active.tone]}`}
            >
              <div className={styles.detailCopy}>
                <p className={styles.eyebrow}>{active.kicker}</p>
                <h3>{active.title}</h3>
                <p className={styles.detailLead}>{active.short}</p>
                <p>{active.detail}</p>
                <ul className={styles.bulletGrid}>
                  {active.bullets.map((bullet) => (
                    <li key={bullet}>
                      <CheckCircle2 aria-hidden />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <FeatureVisual type={active.id} />
            </article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.catalogSection}`}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Feature catalog</p>
            <h2>Built for owners, builders, and public agents.</h2>
            <p>
              Hatcher keeps the high-level path simple, but exposes deeper
              controls when users need them: sessions, terminals, wallets,
              integrations, model presets, and shared agent workflows.
            </p>
          </div>

          <div className={styles.catalogGrid}>
            {FEATURES.map((feature) => (
              <article
                key={feature.id}
                className={`${styles.catalogCard} ${styles[feature.tone]}`}
              >
                <feature.icon aria-hidden />
                <small>{feature.kicker}</small>
                <h3>{feature.title}</h3>
                <p>{feature.short}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.mobileSection}`}>
          <div className={styles.mobileCopy}>
            <p className={styles.eyebrow}>Mobile access</p>
            <h2>Agents on web, Android, and Solana Mobile.</h2>
            <p>
              Launch, inspect, and return to active agents from the surfaces
              your users already use. The mobile apps keep the agent experience
              close without loading the full desktop dashboard.
            </p>
          </div>
          <div
            className={styles.storeBadges}
            aria-label="Hatcher mobile availability"
          >
            <a
              className={styles.storeBadge}
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play aria-hidden />
              <span>
                <small>Get it on</small>
                Google Play
              </span>
            </a>
            <a
              className={styles.storeBadge}
              href={SOLANA_MOBILE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Smartphone aria-hidden />
              <span>
                <small>Available on</small>
                Solana Mobile
              </span>
            </a>
          </div>
        </section>

        <section className={styles.cta}>
          <Bot aria-hidden />
          <div>
            <p className={styles.eyebrow}>Ready to hatch</p>
            <h2>
              Start with one agent. Add skills, rooms, mobile, and CLI when you
              need them.
            </h2>
          </div>
          <Link href="/create" className={styles.primaryAction}>
            Create agent
            <ArrowRight aria-hidden />
          </Link>
        </section>
      </div>
    </MarketingShell>
  );
}

function StorePhone() {
  return (
    <div className={styles.phoneStage} aria-label="Hatcher mobile preview">
      <div className={styles.storePhone}>
        <div className={styles.storeHeroArt}>
          <Image
            src="/landing-v3/robot-hatch-hero.png"
            alt="Hatcher app store banner"
            width={640}
            height={320}
            className={styles.storeHeroImage}
            priority
          />
        </div>
        <div className={styles.storeListing}>
          <div className={styles.appIcon}>
            <Image
              src="/img/hatcher_logo.png"
              alt="Hatcher app icon"
              width={76}
              height={76}
            />
          </div>
          <div className={styles.appCopy}>
            <strong>Hatcher - AI Agents</strong>
            <span>Hatch your AI Agent in 60 seconds</span>
            <small>5.0 ★★★★★</small>
          </div>
          <span className={styles.installPill}>Install</span>
        </div>
        <p>Hatcher puts autonomous AI agents in your pocket.</p>
        <div className={styles.storeScreens}>
          <div className={styles.storeScreen}>
            <span>Welcome back</span>
            <strong>HatcherLabs</strong>
            <div />
            <div />
          </div>
          <div className={styles.storeScreen}>
            <span>Content Forge</span>
            <strong>Active</strong>
            <div />
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ type }: { type: Visual }) {
  if (type === 'email') return <EmailVisual />;
  if (type === 'city') return <CityVisual />;
  if (type === 'room') return <RoomVisual />;
  if (type === 'eyes') return <EyesVisual />;
  if (type === 'skills') return <SkillsVisual />;
  if (type === 'cli') return <CliVisual />;
  if (type === 'mobile') return <StorePhone />;
  if (type === 'github') return <GithubVisual />;
  if (type === 'a2a') return <A2AVisual />;
  if (type === 'models') return <ModelsVisual />;
  return <WalletsVisual />;
}

function EmailVisual() {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewBar}>
        <Mail aria-hidden /> agent inbox
      </div>
      {[
        'New partnership request',
        'Daily research brief',
        'Investor follow-up',
      ].map((item, index) => (
        <div key={item} className={styles.inboxRow}>
          <span className={index === 0 ? styles.liveDot : ''} />
          <div>
            <strong>{item}</strong>
            <p>{index === 0 ? 'Draft reply prepared' : 'Summary ready'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CityVisual() {
  return (
    <div className={`${styles.previewPanel} ${styles.cityPreview}`}>
      <div className={styles.cityShot}>
        <Image
          src="/landing-v3/hatcher-city-live-network.webp"
          alt="Hatcher City live agent network"
          fill
          sizes="(max-width: 980px) 100vw, 420px"
          className={styles.cityImage}
          unoptimized
        />
      </div>
      <div className={styles.cityLegend}>
        <strong>Hatcher City</strong>
        <span>25 districts · live agents · owner buildings</span>
      </div>
    </div>
  );
}

function RoomVisual() {
  return (
    <div className={`${styles.previewPanel} ${styles.roomPreviewPanel}`}>
      <div className={styles.roomScene}>
        <Image
          src="/landing-v3/agent-room-cockpit.png"
          alt="Hatcher 3D agent room cockpit"
          fill
          sizes="(max-width: 980px) 100vw, 420px"
          className={styles.roomSceneImage}
          unoptimized
        />
        <div className={styles.roomSceneShade} />
        <div className={styles.roomAvatarStage} aria-hidden>
          <RoomAvatarPreview />
        </div>
        <div className={styles.roomConsole}>
          <span>avatar</span>
          <span>eyes</span>
          <span>terminal</span>
        </div>
        <div className={styles.roomStatusBadge}>
          <span />
          live room
        </div>
      </div>
    </div>
  );
}

function EyesVisual() {
  return (
    <div className={`${styles.previewPanel} ${styles.eyesPreview}`}>
      <div className={styles.eyesScreen}>
        <div className={styles.eyesScreenTop}>
          <span />
          <strong>EYES LIVE</strong>
          <small>PIP-1</small>
        </div>
        <div className={styles.eyesBrowserFrame}>
          <div className={styles.eyesBrowserChrome}>
            <span />
            <span />
            <span />
            hatcher.host
          </div>
          <div className={styles.eyesBrowserBody}>
            <div />
            <div />
            <div />
          </div>
        </div>
        <div className={styles.eyesStatusRail}>
          <span>visual preview</span>
          <span>owner-visible</span>
          <span>agent-controlled</span>
        </div>
      </div>
    </div>
  );
}

function SkillsVisual() {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.toolGrid}>
        {[
          'web',
          'files',
          'code',
          'cron',
          'wallet',
          'mcp',
          'github',
          'email',
        ].map((tool) => (
          <span key={tool}>{tool}</span>
        ))}
      </div>
    </div>
  );
}

function CliVisual() {
  return (
    <div className={styles.terminalPreview}>
      <span>
        <b>$</b> npm i @hatcherlabs/cli
      </span>
      <span>
        <b>$</b> hatcher
      </span>
      <span>select agent: Pump Sentinel</span>
      <span>terminal attached · owner session</span>
    </div>
  );
}

function GithubVisual() {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.repoTree}>
        <strong>hatcherlabs/app</strong>
        <span>✓ default repo</span>
        <span>✓ agents/runtime.ts</span>
        <span>✓ pull request draft</span>
        <span>✓ code summary ready</span>
      </div>
    </div>
  );
}

function A2AVisual() {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.agentGraph}>
        <span>Scout</span>
        <span>Chart Hawk</span>
        <span>Builder</span>
        <span>Researcher</span>
      </div>
    </div>
  );
}

function ModelsVisual() {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.modelRows}>
        {[
          ['UsePod', 'best price', 'active'],
          ['IDLE Sonnet', '3 credits', 'fixed'],
          ['BYOK', 'private key', 'owner'],
        ].map(([provider, cost, status]) => (
          <div key={provider}>
            <strong>{provider}</strong>
            <span>{cost}</span>
            <small>{status}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletsVisual() {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.walletRows}>
        {['Solana', 'Base', 'SKALE'].map((chain) => (
          <div key={chain}>
            <strong>{chain}</strong>
            <span>balance · QR · runtime access</span>
          </div>
        ))}
      </div>
    </div>
  );
}
