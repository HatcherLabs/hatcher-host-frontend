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
  if (framework === 'openclaw') {
    // OpenClaw adapter + init.mjs only wire these 13 channels. Hermes-only
    // platforms (Signal/Email/SMS/DingTalk/WeCom/Weixin/QQBot/HomeAssistant)
    // have no OpenClaw equivalent — showing them here would let users paste
    // credentials that silently get dropped.
    const openclawSupported = [
      'extra.twitch', 'extra.irc', 'extra.googlechat', 'extra.msteams',
      'extra.mattermost', 'extra.line', 'extra.matrix', 'extra.nostr',
      'extra.feishu', 'extra.zalo', 'extra.nextcloud', 'extra.bluebubbles',
    ];
    return EXTRA_PLATFORM_INTEGRATIONS.filter(i => i.stateKey && openclawSupported.includes(i.stateKey));
  }
  if (framework === 'milady') {
    // Milady v2 is built on @elizaos/core@2.0.0-alpha.109 and only has
    // wired connector logic in the adapter for telegram/discord/slack/
    // whatsapp (bundled at Milady build time). The "extras" UI
    // previously advertised here all required their own v2-alpha plugin
    // to be installed inside the container AND a connector case in the
    // adapter — neither existed, so users' credentials would silently
    // land in milady.json and get ignored. Keeping an empty list until
    // each platform is wired end-to-end (plugin bundled + connector
    // case + smoke tested).
    return [];
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
