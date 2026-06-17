import type { AvatarVariant, RoomEmoteId } from './AgentBody';

const AVATAR_ASSET_BASE = '/assets/3d/agent-room/avatars/';

export type AvatarModelConfig = {
  url: string;
  targetHeight: number;
  clip?: string | number;
  cloneMode?: 'scene' | 'skeleton';
  hover?: boolean;
  hoverY?: number;
  baseScale?: number;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  offset?: [number, number, number];
  emoteClips?: Partial<Record<RoomEmoteId, string | number>>;
  suppressRootEmoteMotion?: boolean;
};

const AVATAR_VARIANT_ALIASES: Record<string, AvatarVariant> = {
  classic: 'hatcher-hatchling-service',
  scout: 'openclaw-scout',
  heavy: 'openclaw-heavy',
  drone: 'openclaw-drone',
  humanoid: 'hatcher-hatchling-operator',
  'protocol-droid': 'hatcher-hatchling-service',
  protocol: 'hatcher-hatchling-service',
  'robot-expressive': 'hatcher-hatchling-service',
  'sentinel-droid': 'openclaw-mech',
  sentinel: 'openclaw-mech',
  'neon-service-droid': 'hatcher-hatchling-service',
  neon: 'hatcher-hatchling-service',
  'graphite-service-droid': 'hatcher-hatchling-operator',
  graphite: 'hatcher-hatchling-operator',
  'freepixel-robot': 'freepixel-robot',
  'alpha-robot': 'freepixel-robot',
  'service-robot': 'service-robot',
  'stealth-service-bot': 'service-robot',
  'rusty-mecha': 'rusty-mecha',
  mecha: 'rusty-mecha',
  'abandoned-mecha': 'abandoned-mecha',
  'scout-drone': 'scout-drone',
  'cyber-drone': 'cyber-drone',
  'buzz-droid': 'buzz-droid',
  'cybernetic-warrior': 'cybernetic-warrior',
  xbot: 'hatcher-hatchling-operator',
  'xbot-prototype': 'hatcher-hatchling-operator',
  'xbot-agent': 'openclaw-mech',
  'cyber-scout': 'openclaw-scout',
  soldier: 'cybernetic-warrior',
  'tactical-soldier': 'cybernetic-warrior',
  'field-soldier': 'cybernetic-warrior',
  'cesium-scout': 'space-analyst',
  'cesium-man': 'space-analyst',
  'space-analyst': 'space-analyst',
  'stealth-operator': 'stealth-operator',
  'rogue-operator': 'rogue-operator',
  'field-operator': 'field-operator',
  'mission-operator': 'field-operator',
  michelle: 'studio-operator',
  'studio-operator': 'studio-operator',
  astronaut: 'space-operator',
  'space-operator': 'space-operator',
  'animated-robot': 'animated-robot',
  'quaternius-robot': 'animated-robot',
  'premium-robot': 'animated-robot',
  'street-scout': 'street-scout',
  'street-operator': 'street-operator',
  operator: 'street-operator',
  'green-technician': 'green-technician',
  technician: 'green-technician',
  explorer: 'openclaw-scout',
  spirit: 'hermes-oracle',
  blob: 'animated-robot',
  fox: 'openclaw-scout',
  crab: 'scout-drone',
  cat: 'street-scout',
  human: 'hatcher-hatchling-operator',
  robot: 'hatcher-hatchling-service',
  'studio-robot': 'hatcher-hatchling-service',
  'expressive-robot': 'hatcher-hatchling-service',
  'robot-signal': 'hatcher-core',
  'signal-robot': 'hatcher-core',
  'robot-ops': 'openclaw-heavy',
  'ops-robot': 'openclaw-heavy',
  'executive-agent': 'executive-agent',
  executive: 'executive-agent',
  'suit-agent': 'suit-agent',
  suit: 'suit-agent',
  'red-jacket': 'red-jacket',
  analyst: 'red-jacket',
  'trail-scout': 'trail-scout',
  trail: 'trail-scout',
  'alien-analyst': 'alien-analyst',
  alien: 'alien-analyst',
  'shadow-operator': 'shadow-operator',
  ninja: 'shadow-operator',
  'xbot-scout': 'openclaw-scout',
  hatcher: 'hatcher-hatchling-service',
  hatchling: 'hatcher-hatchling-service',
  mascot: 'hatcher-hatchling-service',
  'hatcher-hatchling-service': 'hatcher-hatchling-service',
  'hatcher-hatchling-operator': 'hatcher-hatchling-operator',
  'hatcher-shell': 'hatcher-shell',
  core: 'hatcher-core',
  orbital: 'hatcher-core',
  'signal-core': 'hatcher-core',
  'hatcher-core': 'hatcher-core',
  'openclaw-mech': 'openclaw-mech',
  'openclaw-scout': 'openclaw-scout',
  'openclaw-heavy': 'openclaw-heavy',
  'openclaw-drone': 'openclaw-drone',
  'hermes-oracle': 'hermes-oracle',
  'hermes-scribe': 'hermes-scribe',
  'fox-companion': 'fox-companion',
};

const KENNEY_BLOCKY_EMOTE_CLIPS: Partial<Record<RoomEmoteId, string>> = {
  wave: 'emote-yes',
  dance: 'sprint',
  think: 'emote-no',
  scan: 'interact-right',
  work: 'pick-up',
  celebrate: 'emote-yes',
  alert: 'emote-no',
};

const ANIMATED_ROBOT_EMOTE_CLIPS: Partial<Record<RoomEmoteId, string>> = {
  wave: 'RobotArmature|Robot_Wave',
  dance: 'RobotArmature|Robot_Dance',
  think: 'RobotArmature|Robot_No',
  scan: 'RobotArmature|Robot_Walking',
  work: 'RobotArmature|Robot_Punch',
  celebrate: 'RobotArmature|Robot_ThumbsUp',
  alert: 'RobotArmature|Robot_Jump',
};

const THREEJS_HUMANOID_EMOTE_CLIPS: Partial<Record<RoomEmoteId, string>> = {
  dance: 'Run',
  scan: 'Walk',
  work: 'Run',
  alert: 'Run',
};

const SOLDIER_EMOTE_CLIPS: Partial<Record<RoomEmoteId, string>> = {
  wave: 'agree',
  dance: 'run',
  think: 'headShake',
  scan: 'walk',
  work: 'run',
  celebrate: 'agree',
  alert: 'run',
};

export const AVATAR_MODEL_CONFIG = {
  'hatcher-hatchling-service': {
    url: `${AVATAR_ASSET_BASE}hatcher-hatchling-service.glb`,
    targetHeight: 1.42,
    cloneMode: 'scene',
    rotationY: Math.PI,
  },
  'hatcher-hatchling-operator': {
    url: `${AVATAR_ASSET_BASE}hatcher-hatchling-operator.glb`,
    targetHeight: 1.64,
    cloneMode: 'scene',
    rotationY: Math.PI,
  },
  'ready-player': {
    url: `${AVATAR_ASSET_BASE}ready-player.glb`,
    targetHeight: 1.62,
    rotationY: Math.PI,
  },
  'xbot-prototype': {
    url: `${AVATAR_ASSET_BASE}xbot.glb`,
    targetHeight: 1.72,
    clip: 'Idle',
    cloneMode: 'skeleton',
    emoteClips: THREEJS_HUMANOID_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'tactical-soldier': {
    url: `${AVATAR_ASSET_BASE}soldier.glb`,
    targetHeight: 1.78,
    clip: 'idle',
    cloneMode: 'skeleton',
    rotationY: Math.PI,
    emoteClips: SOLDIER_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'cesium-scout': {
    url: `${AVATAR_ASSET_BASE}cesium-man.glb`,
    targetHeight: 1.82,
    clip: 0,
    cloneMode: 'skeleton',
    rotationY: Math.PI,
    suppressRootEmoteMotion: true,
  },
  'xbot-agent': {
    url: `${AVATAR_ASSET_BASE}blocky-cyborg.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'field-operator': {
    url: `${AVATAR_ASSET_BASE}blocky-operator.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'studio-operator': {
    url: `${AVATAR_ASSET_BASE}blocky-scientist.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'space-operator': {
    url: `${AVATAR_ASSET_BASE}astronaut.glb`,
    targetHeight: 1.86,
    cloneMode: 'scene',
    rotationY: Math.PI,
  },
  'animated-robot': {
    url: `${AVATAR_ASSET_BASE}animated-robot.glb`,
    targetHeight: 1.86,
    clip: 'RobotArmature|Robot_Idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: ANIMATED_ROBOT_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'freepixel-robot': {
    url: `${AVATAR_ASSET_BASE}freepixel-robot.glb`,
    targetHeight: 1.84,
    cloneMode: 'scene',
    rotationY: Math.PI / 2,
  },
  'service-robot': {
    url: `${AVATAR_ASSET_BASE}get3d-service-robot.glb`,
    targetHeight: 1.72,
    cloneMode: 'scene',
    rotationY: Math.PI,
  },
  'rusty-mecha': {
    url: `${AVATAR_ASSET_BASE}get3d-rusty-mecha.glb`,
    targetHeight: 1.52,
    cloneMode: 'scene',
    rotationY: Math.PI,
  },
  'abandoned-mecha': {
    url: `${AVATAR_ASSET_BASE}get3d-abandoned-mecha.glb`,
    targetHeight: 1.66,
    cloneMode: 'scene',
  },
  'scout-drone': {
    url: `${AVATAR_ASSET_BASE}get3d-drone.glb`,
    targetHeight: 0.72,
    cloneMode: 'scene',
    hover: true,
    hoverY: 1.12,
  },
  'cyber-drone': {
    url: `${AVATAR_ASSET_BASE}get3d-cyber-drone.glb`,
    targetHeight: 0.78,
    cloneMode: 'scene',
    hover: true,
    hoverY: 1.08,
    rotationY: Math.PI,
  },
  'buzz-droid': {
    url: `${AVATAR_ASSET_BASE}get3d-buzz-droid.glb`,
    targetHeight: 1.28,
    cloneMode: 'scene',
    hover: true,
    hoverY: 0.46,
    rotationY: Math.PI,
  },
  'cybernetic-warrior': {
    url: `${AVATAR_ASSET_BASE}get3d-cybernetic-warrior.glb`,
    targetHeight: 1.78,
    cloneMode: 'scene',
    rotationY: Math.PI,
  },
  'space-analyst': {
    url: `${AVATAR_ASSET_BASE}freepixel-astronaut.glb`,
    targetHeight: 1.74,
    cloneMode: 'scene',
    rotationY: Math.PI / 2,
  },
  'stealth-operator': {
    url: `${AVATAR_ASSET_BASE}freepixel-ninja.glb`,
    targetHeight: 1.72,
    cloneMode: 'scene',
    rotationY: Math.PI / 2,
  },
  'rogue-operator': {
    url: `${AVATAR_ASSET_BASE}freepixel-rogue.glb`,
    targetHeight: 1.72,
    cloneMode: 'scene',
    rotationY: Math.PI / 2,
  },
  'street-scout': {
    url: `${AVATAR_ASSET_BASE}blocky-agent.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'street-operator': {
    url: `${AVATAR_ASSET_BASE}blocky-street-operator.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'green-technician': {
    url: `${AVATAR_ASSET_BASE}blocky-green-technician.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'executive-agent': {
    url: `${AVATAR_ASSET_BASE}blocky-executive.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'suit-agent': {
    url: `${AVATAR_ASSET_BASE}blocky-suit-agent.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'red-jacket': {
    url: `${AVATAR_ASSET_BASE}blocky-red-jacket.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'trail-scout': {
    url: `${AVATAR_ASSET_BASE}blocky-trail-scout.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'alien-analyst': {
    url: `${AVATAR_ASSET_BASE}freepixel-alien.glb`,
    targetHeight: 1.72,
    cloneMode: 'scene',
    rotationY: Math.PI / 2,
  },
  'shadow-operator': {
    url: `${AVATAR_ASSET_BASE}blocky-ninja.glb`,
    targetHeight: 1.86,
    clip: 'idle',
    cloneMode: 'scene',
    rotationY: Math.PI,
    emoteClips: KENNEY_BLOCKY_EMOTE_CLIPS,
    suppressRootEmoteMotion: true,
  },
  'fox-companion': {
    url: `${AVATAR_ASSET_BASE}fox-companion.glb`,
    targetHeight: 0.98,
    clip: 'Survey',
    rotationY: Math.PI,
  },
} satisfies Partial<Record<AvatarVariant, AvatarModelConfig>>;

export type GlbAvatarVariant = keyof typeof AVATAR_MODEL_CONFIG;

export function isGlbAvatarVariant(variant: string): variant is GlbAvatarVariant {
  return variant in AVATAR_MODEL_CONFIG;
}

function normalizeGlbAvatarVariant(value: unknown): GlbAvatarVariant | null {
  if (typeof value !== 'string') return null;
  const normalized = AVATAR_VARIANT_ALIASES[value] ?? value;
  return isGlbAvatarVariant(normalized) ? normalized : null;
}

export function getGlbAvatarModel(variant: string): AvatarModelConfig | null {
  const normalized = normalizeGlbAvatarVariant(variant);
  return normalized ? AVATAR_MODEL_CONFIG[normalized] : null;
}

export function getGlbAvatarUrl(variant: string | null | undefined): string | null {
  if (!variant) return null;
  return getGlbAvatarModel(variant)?.url ?? null;
}
