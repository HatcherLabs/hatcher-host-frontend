'use client';
import { useGLTF } from '@react-three/drei';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import type { FrameworkPalette } from '../three-palette';
import {
  buildAvatarSignature,
  normalizeAvatarTraits,
  personalizePalette,
  type AvatarSignature as AvatarSignatureConfig,
} from './avatarTraits';

export const AVATAR_VARIANTS = [
  {
    id: 'ready-player',
    name: 'Studio Human',
    description: 'casual assistant avatar',
    accent: '#c99a6b',
  },
  {
    id: 'openclaw-mech',
    name: 'Claw Robot',
    description: 'procedural robot avatar',
    accent: '#39ff88',
  },
  {
    id: 'openclaw-scout',
    name: 'Scout Robot',
    description: 'slim recon variant',
    accent: '#ffc857',
  },
  {
    id: 'openclaw-heavy',
    name: 'Heavy Robot',
    description: 'build and deploy specialist',
    accent: '#7dff8a',
  },
  {
    id: 'openclaw-drone',
    name: 'Hover Drone',
    description: 'floating drone avatar',
    accent: '#ff5fa2',
  },
  {
    id: 'hermes-oracle',
    name: 'Oracle Spirit',
    description: 'floating familiar avatar',
    accent: '#8be0ff',
  },
  {
    id: 'hermes-scribe',
    name: 'Scribe Robot',
    description: 'memory keeper avatar',
    accent: '#b088ff',
  },
  {
    id: 'blob',
    name: 'Soft Blob',
    description: 'soft organic helper',
    accent: '#ff5fa2',
  },
  {
    id: 'crab',
    name: 'Crab Bot',
    description: 'side-walking companion avatar',
    accent: '#ff7a5a',
  },
  {
    id: 'cat',
    name: 'Library Cat',
    description: 'small companion avatar',
    accent: '#fff0d0',
  },
  {
    id: 'fox-companion',
    name: 'Fox Companion',
    description: 'ground companion avatar',
    accent: '#fff0d0',
  },
] as const;

export const ROOM_EMOTES = [
  { id: 'wave', name: 'Wave', durationMs: 2200 },
  { id: 'dance', name: 'Dance', durationMs: 4000 },
  { id: 'think', name: 'Think', durationMs: 3000 },
  { id: 'celebrate', name: 'Celebrate', durationMs: 2800 },
  { id: 'alert', name: 'Alert', durationMs: 1600 },
] as const;

export type AvatarVariant = (typeof AVATAR_VARIANTS)[number]['id'];
export type RoomEmoteId = (typeof ROOM_EMOTES)[number]['id'];

interface Props {
  framework: string;
  agentId?: string;
  palette: FrameworkPalette;
  isStreaming?: boolean;
  status?: string;
  avatarVariant?: string | null;
  avatarTraits?: unknown;
  activeEmote?: RoomEmoteId | null;
  emoteNonce?: number;
  showStatusAura?: boolean;
}

const AVATAR_VARIANT_IDS = new Set<string>(AVATAR_VARIANTS.map((variant) => variant.id));
const AVATAR_VARIANT_ALIASES: Record<string, AvatarVariant> = {
  classic: 'openclaw-mech',
  scout: 'openclaw-scout',
  heavy: 'openclaw-heavy',
  drone: 'openclaw-drone',
  humanoid: 'ready-player',
  spirit: 'hermes-oracle',
  blob: 'blob',
  fox: 'fox-companion',
  crab: 'crab',
  cat: 'cat',
  human: 'ready-player',
  robot: 'openclaw-mech',
  'expressive-robot': 'openclaw-mech',
  'xbot-scout': 'openclaw-mech',
  'field-soldier': 'ready-player',
  'openclaw-mech': 'openclaw-mech',
  'openclaw-scout': 'openclaw-scout',
  'openclaw-heavy': 'openclaw-heavy',
  'openclaw-drone': 'openclaw-drone',
  'hermes-oracle': 'hermes-oracle',
  'hermes-scribe': 'hermes-scribe',
};

export function normalizeAvatarVariant(value: unknown): AvatarVariant | null {
  if (typeof value !== 'string') return null;
  if (AVATAR_VARIANT_IDS.has(value)) return value as AvatarVariant;
  return AVATAR_VARIANT_ALIASES[value] ?? null;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickVariant(framework: string, agentId?: string, override?: string | null): AvatarVariant {
  const normalized = normalizeAvatarVariant(override);
  if (normalized) return normalized;
  const key = framework.toLowerCase();
  const seed = hashString(`${key}:${agentId ?? 'default'}`);
  const openclaw: AvatarVariant[] = [
    'openclaw-mech',
    'openclaw-scout',
    'openclaw-heavy',
    'openclaw-drone',
    'crab',
    'ready-player',
    'fox-companion',
    'blob',
  ];
  const hermes: AvatarVariant[] = [
    'ready-player',
    'hermes-oracle',
    'hermes-scribe',
    'cat',
    'fox-companion',
    'blob',
  ];
  if (key === 'openclaw') return openclaw[seed % openclaw.length] ?? 'ready-player';
  if (key === 'hermes') return hermes[seed % hermes.length] ?? 'ready-player';
  return 'ready-player';
}

function pulseFor(status?: string): number {
  if (status === 'active' || status === 'running') return 1.15;
  if (status === 'starting') return 1.35;
  if (status === 'error') return 1.6;
  return 0.72;
}

function statusColor(status: string | undefined, palette: FrameworkPalette): number {
  if (status === 'error' || status === 'crashed') return 0xff3b5c;
  if (status === 'starting') return 0xf59e0b;
  if (status === 'paused' || status === 'sleeping') return 0x94a3b8;
  return palette.primary;
}

const AVATAR_ASSET_BASE = '/assets/3d/agent-room/avatars/';

type AvatarModelConfig = {
  url: string;
  targetHeight: number;
  clip?: string | number;
  hover?: boolean;
  hoverY?: number;
  baseScale?: number;
  rotationY?: number;
  offset?: [number, number, number];
};

type EmotePlaybackProps = {
  activeEmote?: RoomEmoteId | null;
  emoteNonce?: number;
};

type EmoteFrame = {
  id: RoomEmoteId;
  elapsed: number;
  progress: number;
  fade: number;
};

function useEmoteStart(activeEmote?: RoomEmoteId | null, emoteNonce?: number) {
  const startRef = useRef(0);
  useEffect(() => {
    startRef.current = performance.now();
  }, [activeEmote, emoteNonce]);
  return startRef;
}

function readEmoteFrame(
  activeEmote: RoomEmoteId | null | undefined,
  startRef: MutableRefObject<number>,
): EmoteFrame | null {
  if (!activeEmote) return null;
  const spec = ROOM_EMOTES.find((item) => item.id === activeEmote);
  const duration = (spec?.durationMs ?? 1800) / 1000;
  const elapsed = Math.max(0, (performance.now() - startRef.current) / 1000);
  if (elapsed > duration) return null;
  const progress = Math.min(1, elapsed / duration);
  return {
    id: activeEmote,
    elapsed,
    progress,
    fade: Math.sin(progress * Math.PI),
  };
}

const AVATAR_MODEL_CONFIG = {
  'ready-player': {
    url: `${AVATAR_ASSET_BASE}ready-player.glb`,
    targetHeight: 1.62,
    rotationY: Math.PI,
  },
  'fox-companion': {
    url: `${AVATAR_ASSET_BASE}fox-companion.glb`,
    targetHeight: 0.98,
    clip: 'Survey',
    rotationY: Math.PI,
  },
} satisfies Partial<Record<AvatarVariant, AvatarModelConfig>>;

type GlbAvatarVariant = keyof typeof AVATAR_MODEL_CONFIG;

function isGlbAvatarVariant(variant: AvatarVariant): variant is GlbAvatarVariant {
  return variant in AVATAR_MODEL_CONFIG;
}

function pickClip(
  animations: THREE.AnimationClip[] | undefined,
  clip: string | number | undefined,
): THREE.AnimationClip | null {
  if (!animations?.length) return null;
  if (typeof clip === 'string') return THREE.AnimationClip.findByName(animations, clip) ?? animations[0]!;
  if (typeof clip === 'number') return animations[clip] ?? animations[0]!;
  return animations[0]!;
}

function cloneAvatarScene(
  scene: THREE.Group,
  animations: THREE.AnimationClip[] | undefined,
  variant: GlbAvatarVariant,
): {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  bones: Record<string, THREE.Bone>;
  baseRotations: Record<string, THREE.Euler>;
} {
  const config: AvatarModelConfig = AVATAR_MODEL_CONFIG[variant];
  const root = new THREE.Group();
  const clone = cloneSkeleton(scene) as THREE.Group;
  const bones: Record<string, THREE.Bone> = {};
  const baseRotations: Record<string, THREE.Euler> = {};

  clone.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      const bone = child as THREE.Bone;
      bones[bone.name] = bone;
      baseRotations[bone.name] = bone.rotation.clone();
      return;
    }
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materials = sourceMaterials.map((material) => {
      const next = material.clone();
      if (next instanceof THREE.MeshStandardMaterial) {
        next.roughness = Math.min(0.92, next.roughness + 0.08);
        next.envMapIntensity = 0.14;
      }
      return next;
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0]!;
  });

  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const scale = (config.targetHeight / Math.max(size.y, 0.001)) * (config.baseScale ?? 1);
  clone.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(clone);
  const center = scaledBox.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= scaledBox.min.y;
  if (config.hover) clone.position.y += config.hoverY ?? 0.8;
  if (config.offset) {
    clone.position.x += config.offset[0];
    clone.position.y += config.offset[1];
    clone.position.z += config.offset[2];
  }
  if (config.rotationY) clone.rotation.y = config.rotationY;

  root.add(clone);

  let mixer: THREE.AnimationMixer | null = null;
  const clip = pickClip(animations, config.clip);
  if (clip) {
    mixer = new THREE.AnimationMixer(clone);
    const action = mixer.clipAction(clip);
    action.reset().fadeIn(0.2).play();
  }

  return { root, mixer, bones, baseRotations };
}

function resetGlbBones(avatar: ReturnType<typeof cloneAvatarScene>) {
  for (const [name, bone] of Object.entries(avatar.bones)) {
    const base = avatar.baseRotations[name];
    if (base) bone.rotation.copy(base);
  }
}

function setBoneDelta(
  avatar: ReturnType<typeof cloneAvatarScene>,
  name: string,
  x = 0,
  y = 0,
  z = 0,
) {
  const bone = avatar.bones[name];
  const base = avatar.baseRotations[name];
  if (!bone || !base) return;
  bone.rotation.set(base.x + x, base.y + y, base.z + z);
}

function GLBAvatar({
  variant,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: {
  variant: GlbAvatarVariant;
  isStreaming?: boolean;
  status?: string;
} & EmotePlaybackProps) {
  const config: AvatarModelConfig = AVATAR_MODEL_CONFIG[variant];
  const gltf = useGLTF(config.url) as unknown as {
    scene: THREE.Group;
    animations?: THREE.AnimationClip[];
  };
  const avatar = useMemo(
    () => cloneAvatarScene(gltf.scene, gltf.animations, variant),
    [gltf.animations, gltf.scene, variant],
  );
  const root = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);

  useFrame(({ clock }, delta) => {
    avatar.mixer?.update(delta);
    if (!root.current) return;
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    const hover = config.hover ? 0.09 : 0.035;
    let bobY = Math.sin(t * (config.hover ? 1.6 : 1.2)) * hover;
    let rotY = Math.sin(t * 0.4) * (config.hover ? 0.18 : 0.055);
    let scale = isStreaming ? 1 + Math.sin(t * 6.5) * 0.018 * pulse : 1;

    resetGlbBones(avatar);

    if (variant === 'ready-player') {
      setBoneDelta(avatar, 'Head', 0, Math.sin(t * 0.55) * 0.08, 0);
      setBoneDelta(avatar, 'LeftArm', Math.sin(t * 1.2) * 0.04, 0, 0.08);
      setBoneDelta(avatar, 'RightArm', -Math.sin(t * 1.2) * 0.04, 0, -0.08);
    }

    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (variant === 'ready-player') {
        if (emote.id === 'wave') {
          setBoneDelta(avatar, 'RightArm', -1.18 * k, 0.12 * k, -1.08 * k);
          setBoneDelta(avatar, 'RightForeArm', -0.72 * k, Math.sin(et * 10) * 0.42 * k, -0.28 * k);
          setBoneDelta(avatar, 'RightHand', 0, 0, Math.sin(et * 13) * 0.34 * k);
          setBoneDelta(avatar, 'Head', 0.05 * k, Math.sin(et * 4) * 0.14 * k, 0);
        } else if (emote.id === 'dance') {
          rotY = Math.sin(et * 4.8) * 0.38;
          bobY += Math.abs(Math.sin(et * 8.5)) * 0.1 * k;
          setBoneDelta(avatar, 'Spine2', 0, Math.sin(et * 4.8) * 0.18 * k, 0);
          setBoneDelta(avatar, 'LeftArm', -0.82 * k, 0.15 * k, 0.72 * k);
          setBoneDelta(avatar, 'RightArm', -0.82 * k, -0.15 * k, -0.72 * k);
          setBoneDelta(avatar, 'LeftForeArm', -0.42 * k, Math.sin(et * 6) * 0.25 * k, 0);
          setBoneDelta(avatar, 'RightForeArm', -0.42 * k, Math.sin(et * 6 + Math.PI) * 0.25 * k, 0);
          setBoneDelta(avatar, 'LeftUpLeg', Math.sin(et * 8) * 0.18 * k, 0, 0);
          setBoneDelta(avatar, 'RightUpLeg', Math.sin(et * 8 + Math.PI) * 0.18 * k, 0, 0);
        } else if (emote.id === 'think') {
          setBoneDelta(avatar, 'Head', -0.16 * k, 0.16 * k, 0.08 * k);
          setBoneDelta(avatar, 'RightArm', -1.0 * k, 0.12 * k, -0.55 * k);
          setBoneDelta(avatar, 'RightForeArm', -1.55 * k, 0.12 * k, -0.25 * k);
        } else if (emote.id === 'celebrate') {
          bobY += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.28;
          setBoneDelta(avatar, 'LeftArm', -1.45 * k, 0.12 * k, 1.12 * k);
          setBoneDelta(avatar, 'RightArm', -1.45 * k, -0.12 * k, -1.12 * k);
          setBoneDelta(avatar, 'LeftForeArm', -0.44 * k, 0, 0.2 * k);
          setBoneDelta(avatar, 'RightForeArm', -0.44 * k, 0, -0.2 * k);
        } else if (emote.id === 'alert') {
          rotY += Math.sin(et * 34) * 0.18 * (1 - emote.progress);
          bobY += Math.abs(Math.sin(et * 12)) * 0.06 * (1 - emote.progress);
        }
      } else {
        if (emote.id === 'dance') rotY = Math.sin(et * 5.2) * 0.45;
        if (emote.id === 'celebrate') bobY += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.25;
        if (emote.id === 'alert') rotY += Math.sin(et * 32) * 0.2 * (1 - emote.progress);
        if (emote.id === 'wave' || emote.id === 'think') scale += Math.sin(et * 5) * 0.025 * k;
      }
    }

    root.current.position.y = bobY;
    root.current.rotation.y = rotY;
    root.current.scale.setScalar(scale);
  });

  return <primitive ref={root} object={avatar.root} />;
}

function ProceduralAvatar({
  variant,
  palette,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: {
  variant: AvatarVariant;
  palette: FrameworkPalette;
  isStreaming?: boolean;
  status?: string;
} & EmotePlaybackProps) {
  if (variant === 'openclaw-mech') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[0.76, 0.76, 0.76]}>
        <OpenClawMech
          palette={palette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </group>
    );
  }
  if (variant === 'openclaw-scout') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[0.7, 0.7, 0.7]}>
        <OpenClawScout
          palette={palette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </group>
    );
  }
  if (variant === 'openclaw-heavy') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[0.65, 0.65, 0.65]}>
        <OpenClawHeavy
          palette={palette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </group>
    );
  }
  if (variant === 'openclaw-drone') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[0.82, 0.82, 0.82]}>
        <OpenClawDrone
          palette={palette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </group>
    );
  }
  if (variant === 'hermes-oracle') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[0.82, 0.82, 0.82]}>
        <HermesOracle
          palette={palette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </group>
    );
  }
  if (variant === 'hermes-scribe') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[0.74, 0.74, 0.74]}>
        <HermesScribe
          palette={palette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      </group>
    );
  }
  if (variant === 'blob') {
    return (
      <group rotation={[0, Math.PI, 0]} scale={[1.05, 1.05, 1.05]}>
        <BlobAvatar isStreaming={isStreaming} activeEmote={activeEmote} emoteNonce={emoteNonce} />
      </group>
    );
  }
  if (variant === 'crab') {
    return (
      <group rotation={[0, Math.PI, 0]}>
        <CrabAvatar isStreaming={isStreaming} activeEmote={activeEmote} emoteNonce={emoteNonce} />
      </group>
    );
  }
  if (variant === 'cat') {
    return (
      <group rotation={[0, Math.PI, 0]}>
        <CatAvatar isStreaming={isStreaming} activeEmote={activeEmote} emoteNonce={emoteNonce} />
      </group>
    );
  }
  return (
    <HumanoidAvatar
      palette={palette}
      isStreaming={isStreaming}
      status={status}
      activeEmote={activeEmote}
      emoteNonce={emoteNonce}
    />
  );
}

function AgentStatusAura({
  palette,
  isStreaming,
  status,
}: Pick<Props, 'palette' | 'isStreaming' | 'status'>) {
  const floor = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const color = statusColor(status, palette);
  const pulse = pulseFor(status);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (floor.current) {
      floor.current.rotation.z = t * 0.36;
      const s = 1 + Math.sin(t * 2.6) * 0.025 * pulse;
      floor.current.scale.set(s, s, 1);
    }
    if (orbit.current) {
      orbit.current.rotation.y = t * (isStreaming ? 0.72 : 0.28);
      orbit.current.rotation.z = Math.sin(t * 0.5) * 0.08;
    }
    bars.current.forEach((bar, i) => {
      if (!bar) return;
      const active = isStreaming ? 1 : 0.28;
      const h = 0.18 + active * (0.28 + Math.sin(t * 7 + i * 0.75) * 0.18);
      bar.scale.y = Math.max(0.08, h);
      const mat = bar.material as THREE.MeshBasicMaterial;
      mat.opacity += ((isStreaming ? 0.82 : 0.22) - mat.opacity) * 0.14;
    });
  });

  return (
    <group>
      <group ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <mesh>
          <ringGeometry args={[1.14, 1.2, 80]} />
          <meshBasicMaterial
            color={color}
            toneMapped={false}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[1.44, 1.48, 80]} />
          <meshBasicMaterial
            color={palette.bright}
            toneMapped={false}
            transparent
            opacity={isStreaming ? 0.42 : 0.18}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={orbit} position={[0, 1.55, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.18, 0.012, 8, 96]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.36} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.32, 0.01, 8, 96]} />
          <meshBasicMaterial
            color={palette.bright}
            toneMapped={false}
            transparent
            opacity={isStreaming ? 0.46 : 0.2}
          />
        </mesh>
      </group>

      <group position={[0, 2.72, 0.28]}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              bars.current[i] = m;
            }}
            position={[(i - 2) * 0.16, 0, 0]}
          >
            <boxGeometry args={[0.07, 0.7, 0.045]} />
            <meshBasicMaterial
              color={i % 2 ? palette.bright : color}
              toneMapped={false}
              transparent
              opacity={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function AvatarSignature({
  signature,
  isStreaming,
}: {
  signature: AvatarSignatureConfig;
  isStreaming?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const offsetX = ((signature.seed % 5) - 2) * 0.08;
  const offsetY = ((Math.floor(signature.seed / 7) % 5) - 2) * 0.035;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) {
      root.current.position.y = 1.92 + offsetY + Math.sin(t * 1.2 + signature.seed) * 0.035;
      root.current.rotation.y = Math.sin(t * 0.42 + signature.seed) * 0.16;
    }
    if (orbit.current) {
      orbit.current.rotation.z = t * (isStreaming ? 0.96 : 0.42);
      orbit.current.rotation.x = Math.sin(t * 0.34 + signature.seed) * 0.16;
    }
  });

  return (
    <group ref={root} position={[0.58 + offsetX, 1.92, 0.52]} scale={[0.36, 0.36, 0.36]}>
      <group ref={orbit}>
        <mesh>
          <torusGeometry args={[0.48, 0.025, 8, 56]} />
          <meshBasicMaterial color={signature.accent} toneMapped={false} transparent opacity={0.78} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.64, 0.011, 8, 56]} />
          <meshBasicMaterial color={signature.secondary} toneMapped={false} transparent opacity={0.42} />
        </mesh>
      </group>

      {signature.pattern === 'cards' && (
        <group>
          {[-1, 0, 1].map((index) => (
            <mesh key={index} position={[index * 0.18, index * 0.03, 0.02]} rotation={[0, 0, index * 0.16]}>
              <boxGeometry args={[0.18, 0.28, 0.026]} />
              <meshBasicMaterial
                color={index === 0 ? signature.accent : signature.secondary}
                toneMapped={false}
                transparent
                opacity={0.86}
              />
            </mesh>
          ))}
        </group>
      )}

      {signature.pattern === 'scanner' && (
        <group>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.62, 0.035, 0.035]} />
            <meshBasicMaterial color={signature.accent} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.62, 0.035, 0.035]} />
            <meshBasicMaterial color={signature.secondary} toneMapped={false} />
          </mesh>
        </group>
      )}

      {signature.pattern === 'terminal' && (
        <group>
          {Array.from({ length: 4 }, (_, index) => (
            <mesh key={index} position={[(index - 1.5) * 0.12, 0, 0.02]}>
              <boxGeometry args={[0.055, 0.18 + (index % 2) * 0.16, 0.03]} />
              <meshBasicMaterial
                color={index % 2 ? signature.secondary : signature.accent}
                toneMapped={false}
                transparent
                opacity={0.82}
              />
            </mesh>
          ))}
        </group>
      )}

      {signature.pattern === 'spark' && (
        <group>
          {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rotation) => (
            <mesh key={rotation} rotation={[0, 0, rotation]}>
              <boxGeometry args={[0.72, 0.028, 0.028]} />
              <meshBasicMaterial color={signature.accent} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}

      {signature.pattern === 'rings' && (
        <mesh>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial color={signature.secondary} toneMapped={false} transparent opacity={0.92} />
        </mesh>
      )}
    </group>
  );
}

function OpenClawMech({
  palette,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let rootY = Math.sin(t * 1.4) * 0.035;
    let rootRotY = Math.sin(t * 0.42) * 0.07;
    let headRotY = Math.sin(t * 0.85) * 0.18;
    const talk = isStreaming ? Math.sin(t * 7) * 0.35 : Math.sin(t * 1.2) * 0.08;
    let leftArmZ = -0.34 + talk;
    let rightArmZ = 0.34 - talk;

    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'wave') {
        rightArmZ = -1.28 + Math.sin(et * 10) * 0.38 * k;
        headRotY += Math.sin(et * 4) * 0.16 * k;
      } else if (emote.id === 'dance') {
        rootRotY = Math.sin(et * 5) * 0.42;
        rootY += Math.abs(Math.sin(et * 9)) * 0.08 * k;
        leftArmZ = -0.9 + Math.sin(et * 5.5) * 0.42 * k;
        rightArmZ = 0.9 + Math.sin(et * 5.5 + Math.PI) * 0.42 * k;
      } else if (emote.id === 'think') {
        headRotY = 0.28 * k;
        rightArmZ = -0.95 * k;
      } else if (emote.id === 'celebrate') {
        rootY += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.26;
        leftArmZ = -1.22 * k;
        rightArmZ = 1.22 * k;
      } else if (emote.id === 'alert') {
        rootRotY += Math.sin(et * 34) * 0.22 * (1 - emote.progress);
        rootY += Math.abs(Math.sin(et * 12)) * 0.06 * (1 - emote.progress);
      }
    }

    if (root.current) {
      root.current.position.y = rootY;
      root.current.rotation.y = rootRotY;
    }
    if (head.current) head.current.rotation.y = headRotY;
    if (leftArm.current) leftArm.current.rotation.z = leftArmZ;
    if (rightArm.current) rightArm.current.rotation.z = rightArmZ;
  });

  return (
    <group ref={root} scale={[1.05, 1.05, 1.05]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.58, 0.72, 0.38, 8]} />
        <meshStandardMaterial color={0x1e1e25} metalness={0.9} roughness={0.32} />
      </mesh>

      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.34, 0.7, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.85, 0.22]} />
            <meshStandardMaterial color={0x202027} metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.5, 0.08]}>
            <boxGeometry args={[0.38, 0.12, 0.46]} />
            <meshStandardMaterial color={0x16161d} metalness={0.82} roughness={0.42} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.95, 0.92, 0.62]} />
        <meshStandardMaterial
          color={0x22212a}
          metalness={0.92}
          roughness={0.28}
          emissive={palette.primary}
          emissiveIntensity={0.08 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.46, 0.34]}>
        <circleGeometry args={[0.24, 32]} />
        <meshBasicMaterial color={palette.primary} toneMapped={false} transparent opacity={0.78} />
      </mesh>

      <group ref={head} position={[0, 2.12, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.42, 0.48]} />
          <meshStandardMaterial
            color={0x272630}
            metalness={0.86}
            roughness={0.3}
            emissive={palette.primary}
            emissiveIntensity={0.06}
          />
        </mesh>
        <mesh position={[0, 0, 0.26]}>
          <boxGeometry args={[0.46, 0.08, 0.03]} />
          <meshBasicMaterial color={palette.bright} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshStandardMaterial color={0x2a2a32} metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color={palette.primary} toneMapped={false} />
        </mesh>
      </group>

      {[-1, 1].map((s) => (
        <group
          key={s}
          ref={s < 0 ? leftArm : rightArm}
          position={[s * 0.62, 1.72, 0]}
          rotation={[0, 0, s * 0.34]}
        >
          <mesh position={[s * 0.22, -0.32, 0]}>
            <boxGeometry args={[0.2, 0.72, 0.18]} />
            <meshStandardMaterial color={0x202027} metalness={0.9} roughness={0.32} />
          </mesh>
          <mesh position={[s * 0.34, -0.78, 0]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial
              color={0x2a2930}
              metalness={0.9}
              roughness={0.28}
              emissive={palette.bright}
              emissiveIntensity={0.08}
            />
          </mesh>
          {[-1, 1].map((claw) => (
            <mesh
              key={claw}
              position={[s * (0.4 + claw * 0.04), -0.96, claw * 0.09]}
              rotation={[0.35 * claw, 0, 0]}
            >
              <boxGeometry args={[0.08, 0.26, 0.04]} />
              <meshBasicMaterial color={palette.primary} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function OpenClawScout(props: Omit<Props, 'framework' | 'agentId'>) {
  return (
    <group scale={[0.76, 1.14, 0.76]}>
      <OpenClawMech {...props} />
    </group>
  );
}

function OpenClawHeavy(props: Omit<Props, 'framework' | 'agentId'>) {
  return (
    <group scale={[1.28, 1.05, 1.18]}>
      <OpenClawMech {...props} />
    </group>
  );
}

function OpenClawDrone({
  palette,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);
  const droneAccent = 0xff5fa2;
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let y = 1.35 + Math.sin(t * 1.6) * 0.09;
    let rotY = Math.sin(t * 0.35) * 0.16;
    let scale = 1;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'dance') {
        rotY += Math.sin(et * 7) * 0.55 * k;
        y += Math.abs(Math.sin(et * 10)) * 0.18 * k;
      } else if (emote.id === 'celebrate') {
        y += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.42;
        scale = 1 + Math.sin(et * 12) * 0.04 * k;
      } else if (emote.id === 'wave') {
        rotY += Math.sin(et * 9) * 0.35 * k;
      } else if (emote.id === 'think') {
        y += Math.sin(et * 3) * 0.05 * k;
        scale = 1 - 0.04 * k;
      } else if (emote.id === 'alert') {
        rotY += Math.sin(et * 36) * 0.34 * (1 - emote.progress);
      }
    }
    if (root.current) {
      root.current.position.y = y;
      root.current.rotation.y = rotY;
      root.current.scale.setScalar(scale);
    }
    if (rotor.current) rotor.current.rotation.y += emote ? 0.72 : isStreaming ? 0.42 : 0.16;
  });

  return (
    <group ref={root} scale={[0.78, 0.78, 0.78]}>
      <mesh>
        <sphereGeometry args={[0.58, 28, 20]} />
        <meshStandardMaterial
          color={0xa5b4cc}
          metalness={0.86}
          roughness={0.27}
          emissive={droneAccent}
          emissiveIntensity={0.08 * pulse}
        />
      </mesh>
      <mesh position={[0, 0, 0.48]}>
        <circleGeometry args={[0.26, 32]} />
        <meshBasicMaterial color={droneAccent} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <group ref={rotor} position={[0, 0.58, 0]}>
        {[0, Math.PI / 2].map((r) => (
          <mesh key={r} rotation={[0, r, 0]}>
            <boxGeometry args={[1.5, 0.035, 0.12]} />
            <meshBasicMaterial
              color={droneAccent}
              toneMapped={false}
              transparent
              opacity={0.62}
            />
          </mesh>
        ))}
      </group>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.92, -0.08, Math.sin(a) * 0.92]}>
            <mesh>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshBasicMaterial color={droneAccent} toneMapped={false} />
            </mesh>
            <mesh rotation={[0, a, 0]}>
              <boxGeometry args={[0.8, 0.035, 0.035]} />
              <meshStandardMaterial color={0x25242d} metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.48, 40]} />
        <meshBasicMaterial
          color={droneAccent}
          toneMapped={false}
          transparent
          opacity={isStreaming ? 0.9 : 0.42}
        />
      </mesh>
    </group>
  );
}

function HermesOracle({
  palette,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let y = Math.sin(t * 1.1) * 0.045;
    let rotY = Math.sin(t * 0.28) * 0.12;
    let scale = 1;
    let ringTilt = Math.sin(t * 0.35) * 0.18;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'wave') {
        rotY += Math.sin(et * 8) * 0.36 * k;
        ringTilt += Math.sin(et * 11) * 0.3 * k;
      } else if (emote.id === 'dance') {
        rotY = Math.sin(et * 5.8) * 0.55;
        y += Math.abs(Math.sin(et * 8)) * 0.12 * k;
        ringTilt = Math.sin(et * 6) * 0.48 * k;
      } else if (emote.id === 'think') {
        scale = 0.94 + Math.sin(et * 4) * 0.02 * k;
        y += Math.sin(et * 2.4) * 0.05 * k;
      } else if (emote.id === 'celebrate') {
        y += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.36;
        scale = 1 + Math.sin(et * 12) * 0.04 * k;
      } else if (emote.id === 'alert') {
        rotY += Math.sin(et * 34) * 0.28 * (1 - emote.progress);
        scale = 1 + Math.sin(et * 28) * 0.025 * (1 - emote.progress);
      }
    }
    if (root.current) {
      root.current.position.y = y;
      root.current.rotation.y = rotY;
      root.current.scale.setScalar(scale);
    }
    if (rings.current) {
      rings.current.rotation.y = t * (isStreaming || emote ? 0.72 : 0.28);
      rings.current.rotation.x = ringTilt;
    }
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.72, 1.45, 5]} />
        <meshStandardMaterial
          color={0x1e1728}
          metalness={0.24}
          roughness={0.78}
          emissive={palette.primary}
          emissiveIntensity={0.05 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.34, 22, 18]} />
        <meshStandardMaterial
          color={0x241832}
          metalness={0.42}
          roughness={0.48}
          emissive={palette.primary}
          emissiveIntensity={0.12 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.54, 0.3]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial color={palette.bright} toneMapped={false} transparent opacity={0.82} />
      </mesh>

      <group ref={rings} position={[0, 1.55, 0]}>
        {[0, Math.PI / 2, Math.PI / 4].map((r, i) => (
          <mesh key={i} rotation={[r, i === 2 ? Math.PI / 3 : 0, 0]}>
            <torusGeometry args={[0.82 + i * 0.16, 0.015, 8, 72]} />
            <meshBasicMaterial
              color={i === 1 ? palette.bright : palette.primary}
              toneMapped={false}
              transparent
              opacity={0.72}
            />
          </mesh>
        ))}
      </group>

      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.05, 1.05 + i * 0.2, Math.sin(a) * 1.05]}
            rotation={[0, -a + Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.34, 0.46, 0.025]} />
            <meshStandardMaterial
              color={0x261a34}
              metalness={0.28}
              roughness={0.64}
              emissive={palette.primary}
              emissiveIntensity={0.18}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function HermesScribe({
  palette,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const pages = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let y = Math.sin(t * 1.2) * 0.05;
    let rotY = Math.sin(t * 0.35) * 0.08;
    let scale = 1;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'wave') {
        rotY += Math.sin(et * 9) * 0.42 * k;
      } else if (emote.id === 'dance') {
        rotY = Math.sin(et * 5.5) * 0.54;
        y += Math.abs(Math.sin(et * 8.5)) * 0.11 * k;
      } else if (emote.id === 'think') {
        rotY -= 0.22 * k;
        y -= 0.04 * k;
      } else if (emote.id === 'celebrate') {
        y += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.3;
        scale = 1 + Math.sin(et * 12) * 0.035 * k;
      } else if (emote.id === 'alert') {
        rotY += Math.sin(et * 36) * 0.28 * (1 - emote.progress);
      }
    }
    if (root.current) {
      root.current.position.y = y;
      root.current.rotation.y = rotY;
      root.current.scale.setScalar(scale);
    }
    if (pages.current) pages.current.rotation.y = t * (isStreaming || emote ? 0.64 : 0.22);
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.52, 0.72, 0.72, 6]} />
        <meshStandardMaterial color={0x1d1627} metalness={0.34} roughness={0.74} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[0.75, 0.88, 0.44]} />
        <meshStandardMaterial
          color={0x241832}
          metalness={0.32}
          roughness={0.58}
          emissive={palette.primary}
          emissiveIntensity={0.08 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <sphereGeometry args={[0.28, 20, 18]} />
        <meshStandardMaterial
          color={0x2a1d3a}
          metalness={0.36}
          roughness={0.45}
          emissive={palette.bright}
          emissiveIntensity={0.08 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.88, 0.26]}>
        <boxGeometry args={[0.38, 0.07, 0.025]} />
        <meshBasicMaterial color={palette.bright} toneMapped={false} />
      </mesh>

      <group ref={pages} position={[0, 1.32, 0]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.92, Math.sin(i) * 0.16, Math.sin(a) * 0.92]}
              rotation={[0, -a + Math.PI / 2, 0]}
            >
              <boxGeometry args={[0.28, 0.38, 0.018]} />
              <meshBasicMaterial
                color={i % 2 ? palette.primary : palette.bright}
                toneMapped={false}
                transparent
                opacity={0.54}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function HumanoidAvatar({
  palette,
  isStreaming,
  status,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const pulse = pulseFor(status);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let rootY = Math.sin(t * 1.3) * 0.025;
    let rootRotY = Math.sin(t * 0.35) * 0.08;
    const talk = isStreaming ? Math.sin(t * 7) * 0.28 : Math.sin(t * 1.4) * 0.06;
    let leftZ = 0.18 + talk;
    let rightZ = -0.18 - talk;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'wave') {
        rightZ = -1.25 + Math.sin(et * 10) * 0.42 * k;
      } else if (emote.id === 'dance') {
        rootRotY = Math.sin(et * 5) * 0.46;
        rootY += Math.abs(Math.sin(et * 9)) * 0.08 * k;
        leftZ = 0.72 + Math.sin(et * 5) * 0.3 * k;
        rightZ = -0.72 + Math.sin(et * 5 + Math.PI) * 0.3 * k;
      } else if (emote.id === 'think') {
        rightZ = -0.95 * k;
      } else if (emote.id === 'celebrate') {
        rootY += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.3;
        leftZ = 1.08 * k;
        rightZ = -1.08 * k;
      } else if (emote.id === 'alert') {
        rootRotY += Math.sin(et * 34) * 0.25 * (1 - emote.progress);
      }
    }
    if (root.current) {
      root.current.position.y = rootY;
      root.current.rotation.y = rootRotY;
    }
    if (leftArm.current) leftArm.current.rotation.z = leftZ;
    if (rightArm.current) rightArm.current.rotation.z = rightZ;
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.28, 0.36, 0.78, 14]} />
        <meshStandardMaterial
          color={0xe7d6c3}
          roughness={0.58}
          emissive={palette.primary}
          emissiveIntensity={0.04 * pulse}
        />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.25, 18, 14]} />
        <meshStandardMaterial color={0xe7d6c3} roughness={0.52} />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 1.45, 0.22]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color={palette.bright} toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group
          key={side}
          ref={side < 0 ? leftArm : rightArm}
          position={[side * 0.38, 1.12, 0]}
          rotation={[0, 0, side * -0.18]}
        >
          <mesh position={[side * 0.1, -0.24, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.62, 8]} />
            <meshStandardMaterial color={0x5b463a} roughness={0.62} />
          </mesh>
        </group>
      ))}
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <cylinderGeometry args={[0.055, 0.065, 0.54, 8]} />
          <meshStandardMaterial color={0x382e26} roughness={0.68} />
        </mesh>
      ))}
    </group>
  );
}

function BlobAvatar({
  isStreaming,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId' | 'palette'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!root.current) return;
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let sx = 1 + Math.sin(t * 2.4) * 0.035;
    let sy = 1 + Math.sin(t * 2.1) * 0.05;
    let y = Math.sin(t * 1.8) * 0.035;
    let rotY = isStreaming ? Math.sin(t * 5) * 0.12 : 0;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'wave') {
        sx += Math.sin(et * 10) * 0.12 * k;
        rotY += Math.sin(et * 8) * 0.36 * k;
      } else if (emote.id === 'dance') {
        y += Math.abs(Math.sin(et * 8)) * 0.16 * k;
        sx += Math.sin(et * 8) * 0.12 * k;
        sy += Math.sin(et * 8 + Math.PI) * 0.1 * k;
        rotY = Math.sin(et * 5) * 0.48;
      } else if (emote.id === 'think') {
        sx -= 0.08 * k;
        sy += 0.08 * k;
      } else if (emote.id === 'celebrate') {
        y += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.34;
        sx += Math.sin(et * 13) * 0.08 * k;
        sy += Math.sin(et * 13) * 0.08 * k;
      } else if (emote.id === 'alert') {
        sx += Math.sin(et * 34) * 0.08 * (1 - emote.progress);
        rotY += Math.sin(et * 34) * 0.22 * (1 - emote.progress);
      }
    }
    root.current.scale.set(sx, sy, 1);
    root.current.position.y = y;
    root.current.rotation.y = rotY;
  });
  return (
    <group ref={root}>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.64, 28, 18]} />
        <meshStandardMaterial color={0xffb3c8} roughness={0.82} />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.8, 0.54]}>
          <sphereGeometry args={[0.065, 10, 8]} />
          <meshBasicMaterial color="#6b2840" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.56, 0.61]} scale={[1, 0.28, 1]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshBasicMaterial color="#a83a64" toneMapped={false} />
      </mesh>
    </group>
  );
}

function CompanionAvatar({ isStreaming }: Omit<Props, 'framework' | 'agentId' | 'palette'>) {
  const tail = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (root.current) root.current.position.y = Math.abs(Math.sin(t * 2.2)) * 0.035;
    if (tail.current) tail.current.rotation.y = Math.sin(t * (isStreaming ? 8 : 3)) * 0.34;
  });
  return (
    <group ref={root} scale={[1.05, 1.05, 1.05]}>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[0.52, 0.34, 0.78]} />
        <meshStandardMaterial color={0xe89752} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.9, 0.42]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color={0xe89752} roughness={0.7} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 1.12, 0.38]} rotation={[0, 0, x < 0 ? -0.34 : 0.34]}>
          <coneGeometry args={[0.08, 0.18, 4]} />
          <meshStandardMaterial color={0x3a200d} roughness={0.68} />
        </mesh>
      ))}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.94, 0.64]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color="#fff0d0" toneMapped={false} />
        </mesh>
      ))}
      <group ref={tail} position={[0, 0.72, -0.44]} rotation={[0.8, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.12, 0.68, 9]} />
          <meshStandardMaterial color={0xe89752} roughness={0.72} />
        </mesh>
      </group>
      {[-0.18, 0.18].flatMap((x) =>
        [-0.2, 0.22].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.24, z]}>
            <cylinderGeometry args={[0.045, 0.055, 0.3, 8]} />
            <meshStandardMaterial color={0x6b3818} roughness={0.76} />
          </mesh>
        )),
      )}
    </group>
  );
}

function CrabAvatar({
  isStreaming,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId' | 'palette'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    if (!root.current) return;
    let x = Math.sin(t * (isStreaming ? 5 : 1.8)) * 0.045;
    let y = 0;
    let rotY = Math.sin(t * 2) * 0.08;
    let scale = 1;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'dance') {
        x += Math.sin(et * 12) * 0.18 * k;
        rotY += Math.sin(et * 10) * 0.32 * k;
      } else if (emote.id === 'celebrate') {
        y += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.24;
        scale = 1 + Math.sin(et * 10) * 0.05 * k;
      } else if (emote.id === 'wave') {
        rotY += Math.sin(et * 8) * 0.24 * k;
      } else if (emote.id === 'think') {
        scale = 0.94 + 0.03 * Math.sin(et * 3) * k;
      } else if (emote.id === 'alert') {
        x += Math.sin(et * 35) * 0.08 * (1 - emote.progress);
      }
    }
    root.current.position.set(x, y, 0);
    root.current.rotation.y = rotY;
    root.current.scale.setScalar(scale);
  });
  return (
    <group ref={root}>
      <mesh position={[0, 0.55, 0]} scale={[1.15, 0.55, 0.75]}>
        <sphereGeometry args={[0.56, 18, 12]} />
        <meshStandardMaterial color={0xff7a5a} roughness={0.72} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <group key={x} position={[x, 0.92, 0.18]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.18, 6]} />
            <meshStandardMaterial color={0x6b2010} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshBasicMaterial color="#fff0c8" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.58, 0.58, 0.1]}>
          <mesh position={[side * 0.18, 0, 0]}>
            <boxGeometry args={[0.36, 0.09, 0.1]} />
            <meshStandardMaterial color={0x6b2010} roughness={0.7} />
          </mesh>
          <mesh position={[side * 0.42, 0.03, 0]} scale={[1, 0.65, 0.7]}>
            <sphereGeometry args={[0.15, 10, 8]} />
            <meshStandardMaterial color={0xff7a5a} roughness={0.72} />
          </mesh>
        </group>
      ))}
      {[-1, 1].flatMap((side) =>
        [-0.24, 0, 0.24].map((z) => (
          <mesh key={`${side}-${z}`} position={[side * 0.4, 0.28, z]} rotation={[0, 0, side * 0.74]}>
            <boxGeometry args={[0.32, 0.045, 0.05]} />
            <meshStandardMaterial color={0xa83a18} roughness={0.76} />
          </mesh>
        )),
      )}
    </group>
  );
}

function CatAvatar({
  isStreaming,
  activeEmote,
  emoteNonce,
}: Omit<Props, 'framework' | 'agentId' | 'palette'> & EmotePlaybackProps) {
  const root = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const emoteStart = useEmoteStart(activeEmote, emoteNonce);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const emote = readEmoteFrame(activeEmote, emoteStart);
    let y = 0;
    let rotY = 0;
    let scale = 1;
    let tailSpeed = isStreaming ? 6 : 2;
    if (emote) {
      const et = emote.elapsed;
      const k = emote.fade;
      if (emote.id === 'dance') {
        y += Math.abs(Math.sin(et * 9)) * 0.08 * k;
        rotY = Math.sin(et * 6) * 0.28 * k;
        tailSpeed = 9;
      } else if (emote.id === 'celebrate') {
        y += Math.max(0, Math.sin(Math.min(et * 4, Math.PI * 2))) * 0.22;
        scale = 1 + Math.sin(et * 12) * 0.04 * k;
        tailSpeed = 10;
      } else if (emote.id === 'wave') {
        rotY = Math.sin(et * 8) * 0.18 * k;
        tailSpeed = 12;
      } else if (emote.id === 'think') {
        rotY = 0.18 * k;
        scale = 0.96;
        tailSpeed = 1.2;
      } else if (emote.id === 'alert') {
        rotY = Math.sin(et * 34) * 0.2 * (1 - emote.progress);
        tailSpeed = 14;
      }
    }
    if (root.current) {
      root.current.position.y = y;
      root.current.rotation.y = rotY;
      root.current.scale.setScalar(scale);
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * tailSpeed) * 0.32;
  });
  return (
    <group ref={root}>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.78, 14]} />
        <meshStandardMaterial color={0xe8d8b8} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.78, 0.44]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial color={0xe8d8b8} roughness={0.78} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.98, 0.4]} rotation={[0, 0, x < 0 ? -0.28 : 0.28]}>
          <coneGeometry args={[0.08, 0.18, 4]} />
          <meshStandardMaterial color={0x3a2818} roughness={0.72} />
        </mesh>
      ))}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.8, 0.64]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color="#7dff8a" toneMapped={false} />
        </mesh>
      ))}
      <group ref={tail} position={[0, 0.64, -0.44]} rotation={[0.8, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.055, 0.07, 0.58, 8]} />
          <meshStandardMaterial color={0x6b4830} roughness={0.76} />
        </mesh>
      </group>
      {[-0.16, 0.16].flatMap((x) =>
        [-0.2, 0.22].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.22, z]}>
            <cylinderGeometry args={[0.04, 0.045, 0.26, 8]} />
            <meshStandardMaterial color={0x6b4830} roughness={0.78} />
          </mesh>
        )),
      )}
    </group>
  );
}

function PersonAvatar({ palette, isStreaming }: Omit<Props, 'framework' | 'agentId'>) {
  return (
    <group>
      <HumanoidAvatar palette={palette} isStreaming={isStreaming} status="active" />
      <mesh position={[0, 0.82, 0.03]}>
        <boxGeometry args={[0.42, 0.58, 0.04]} />
        <meshStandardMaterial color={0x2b3a5e} roughness={0.66} />
      </mesh>
      <mesh position={[0, 1.67, -0.03]} scale={[1, 0.42, 0.82]}>
        <sphereGeometry args={[0.24, 16, 10]} />
        <meshStandardMaterial color={0x2b1d16} roughness={0.78} />
      </mesh>
    </group>
  );
}

export function AgentBody({
  framework,
  agentId,
  palette,
  isStreaming,
  status,
  avatarVariant,
  avatarTraits,
  activeEmote,
  emoteNonce,
  showStatusAura = true,
}: Props) {
  const variant = useMemo(
    () => pickVariant(framework, agentId, avatarVariant),
    [framework, agentId, avatarVariant],
  );
  const normalizedTraits = useMemo(() => normalizeAvatarTraits(avatarTraits), [avatarTraits]);
  const seedInput = `${framework}:${agentId ?? 'draft'}:${variant}:${avatarVariant ?? ''}`;
  const personalizedPalette = useMemo(
    () => personalizePalette(palette, normalizedTraits, seedInput),
    [normalizedTraits, palette, seedInput],
  );
  const signature = useMemo(
    () => buildAvatarSignature(normalizedTraits, seedInput),
    [normalizedTraits, seedInput],
  );

  return (
    <>
      {showStatusAura && isStreaming && (
        <AgentStatusAura palette={personalizedPalette} isStreaming={isStreaming} status={status} />
      )}
      {isGlbAvatarVariant(variant) ? (
        <GLBAvatar
          variant={variant}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      ) : (
        <ProceduralAvatar
          variant={variant}
          palette={personalizedPalette}
          isStreaming={isStreaming}
          status={status}
          activeEmote={activeEmote}
          emoteNonce={emoteNonce}
        />
      )}
      <AvatarSignature signature={signature} isStreaming={isStreaming} />
    </>
  );
}

Object.values(AVATAR_MODEL_CONFIG).forEach((config) => useGLTF.preload(config.url));
