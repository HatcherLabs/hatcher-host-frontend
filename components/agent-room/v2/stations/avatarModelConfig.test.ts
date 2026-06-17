import { describe, expect, it } from 'vitest';
import { getGlbAvatarModel, getGlbAvatarUrl } from './avatarModelConfig';

describe('avatarModelConfig', () => {
  it('resolves canonical GLB avatar variants', () => {
    expect(getGlbAvatarUrl('hatcher-hatchling-service')).toBe(
      '/assets/3d/agent-room/avatars/hatcher-hatchling-service.glb',
    );
    expect(getGlbAvatarModel('hatcher-hatchling-operator')).toMatchObject({
      targetHeight: 1.64,
      cloneMode: 'scene',
    });
  });

  it('preserves legacy aliases used by city agents', () => {
    expect(getGlbAvatarUrl('animated-robot')).toContain('animated-robot.glb');
    expect(getGlbAvatarUrl('alpha-robot')).toContain('freepixel-robot.glb');
    expect(getGlbAvatarUrl('crab')).toContain('get3d-drone.glb');
  });

  it('returns null for procedural-only variants and unknown values', () => {
    expect(getGlbAvatarModel('openclaw-scout')).toBeNull();
    expect(getGlbAvatarUrl('does-not-exist')).toBeNull();
  });
});
