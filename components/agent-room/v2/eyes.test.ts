import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EYES_CAPTURE_URL,
  buildDefaultEyesConfig,
  normalizeEyesCaptureTarget,
  normalizeRoomEyesConfig,
  normalizeRoomEyesLiveFeed,
} from './eyes';

describe('room eyes config', () => {
  it('builds a safe one-pip default workspace for an agent', () => {
    const config = buildDefaultEyesConfig('Chart Hawk');

    expect(config.enabled).toBe(false);
    expect(config.pipCount).toBe(1);
    expect(config.approvalMode).toBe('ask');
    expect(config.pips).toHaveLength(1);
    expect(config.pips[0]).toMatchObject({
      id: 'pip-1',
      label: 'Chart Hawk screen 1',
      source: 'browser',
      enabled: true,
      agentControl: false,
    });
  });

  it('normalizes persisted values and clamps the pip count to one through eight', () => {
    const config = normalizeRoomEyesConfig(
      {
        enabled: true,
        globalControl: true,
        approvalMode: 'trusted',
        pipCount: 12,
        pips: [
          {
            id: 'main',
            label: 'Main browser',
            source: 'desktop',
            enabled: false,
            agentControl: true,
          },
        ],
      },
      'Sato Scout',
    );

    expect(config.pipCount).toBe(8);
    expect(config.pips).toHaveLength(8);
    expect(config.pips[0]).toEqual({
      id: 'main',
      label: 'Main browser',
      source: 'desktop',
      enabled: false,
      agentControl: true,
    });
    expect(config.pips[7]).toMatchObject({
      id: 'pip-8',
      label: 'Sato Scout screen 8',
      source: 'browser',
      enabled: false,
      agentControl: false,
    });
  });

  it('normalizes live feed data for room screens without trusting raw payloads', () => {
    const feed = normalizeRoomEyesLiveFeed({
      status: 'running',
      lines: [' boot ', 42, 'tool call complete', ''],
      updatedAt: 'not-a-number',
      messagesToday: 3,
      uptimeSec: -10,
      state: {
        status: 'live',
        mode: 'browser',
        action: ' Reading rendered page ',
        title: 'Hatcher',
        url: 'https://hatcher.host/features',
        pipId: 'pip-1',
        publicSafe: true,
        startedAt: 1780060000000,
        updatedAt: 1780060001000,
        frame: 2,
      },
    });

    expect(feed.status).toBe('running');
    expect(feed.lines).toEqual(['boot', 'tool call complete']);
    expect(feed.messagesToday).toBe(3);
    expect(feed.uptimeSec).toBeUndefined();
    expect(feed.updatedAt).toBeGreaterThan(0);
    expect(feed.state).toMatchObject({
      mode: 'browser',
      action: 'Reading rendered page',
      publicSafe: true,
      frame: 2,
    });
  });

  it('keeps a valid live screenshot but drops unsafe screenshot payloads', () => {
    const feed = normalizeRoomEyesLiveFeed({
      status: 'live',
      lines: [],
      updatedAt: 1780060000000,
      screenshot: {
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        mimeType: 'image/png',
        capturedAt: 1780060000000,
        size: 12,
      },
    });

    expect(feed.screenshot?.dataUrl).toBe('data:image/png;base64,iVBORw0KGgo=');

    const unsafe = normalizeRoomEyesLiveFeed({
      screenshot: {
        dataUrl: 'javascript:alert(1)',
        mimeType: 'image/svg+xml',
        capturedAt: 1,
        size: 1,
      },
    });

    expect(unsafe.screenshot).toBeUndefined();
  });

  it('normalizes the default Eyes capture target for UI-triggered starts', () => {
    expect(
      normalizeEyesCaptureTarget(' https://hatcher.host/features#pricing '),
    ).toBe('https://hatcher.host/features');
    expect(normalizeEyesCaptureTarget('ftp://example.com/file')).toBe(
      DEFAULT_EYES_CAPTURE_URL,
    );
    expect(normalizeEyesCaptureTarget('')).toBe(DEFAULT_EYES_CAPTURE_URL);
  });
});
