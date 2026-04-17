import type { IntegrationDef } from './types';
import { OPENCLAW_INTEGRATIONS, EXTRA_PLATFORM_INTEGRATIONS } from './constants';

// ─── Helpers ─────────────────────────────────────────────────

export function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function integrationStateKey(i: IntegrationDef): string {
  return i.stateKey ?? i.featureKey;
}

/** Get integrations filtered by framework */
export function getIntegrationsForFramework(framework: string): IntegrationDef[] {
  return OPENCLAW_INTEGRATIONS.filter(
    (i) => !i.frameworks || i.frameworks.includes(framework as 'openclaw' | 'hermes' | 'elizaos' | 'milady'),
  );
}

/** Get extra integrations filtered by framework.
 *  Extra platforms use OpenClaw's npm channel extensions — available for openclaw, milady, and hermes (subset). */
export function getExtraIntegrationsForFramework(framework: string): IntegrationDef[] {
  if (framework === 'openclaw') return EXTRA_PLATFORM_INTEGRATIONS;
  if (framework === 'milady') {
    // Milady supports most extra channels too (built on elizaOS with 29 connectors)
    const miladySupported = ['extra.twitch', 'extra.mattermost', 'extra.line', 'extra.matrix', 'extra.nostr', 'extra.feishu', 'extra.bluebubbles'];
    return EXTRA_PLATFORM_INTEGRATIONS.filter(i => i.stateKey && miladySupported.includes(i.stateKey));
  }
  if (framework === 'hermes') {
    // Full list of platforms supported by upstream hermes-agent gateway
    // at the pinned commit. WhatsApp intentionally excluded — pairing
    // needs a TTY flow the dashboard can't drive yet.
    const hermesSupported = [
      'extra.signal', 'extra.matrix', 'extra.email', 'extra.sms',
      'extra.mattermost', 'extra.bluebubbles', 'extra.homeassistant',
      'extra.feishu', 'extra.dingtalk', 'extra.wecom', 'extra.weixin',
      'extra.qqbot',
    ];
    return EXTRA_PLATFORM_INTEGRATIONS.filter(i => i.stateKey && hermesSupported.includes(i.stateKey));
  }
  return [];
}
