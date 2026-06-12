import { describe, expect, it } from 'vitest';

import {
  MIRARI_LAYOUT_GRID_CLASSNAME,
  MIRARI_RESULT_PANEL_CLASSNAME,
  MIRARI_RESULT_PRE_CLASSNAME,
  buildMirariTestSignalPayload,
} from './MirariWalletPanel';

describe('Mirari wallet panel helpers', () => {
  it('builds a typed Mirari test signal payload from form fields', () => {
    expect(buildMirariTestSignalPayload({
      kind: ' focus_hit ',
      severity: '4',
      summary: ' Dashboard smoke test ',
      payloadJson: '{ "source": "vitest", "nested": { "ok": true } }',
    })).toEqual({
      kind: 'focus_hit',
      severity: 4,
      summary: 'Dashboard smoke test',
      payload: { source: 'vitest', nested: { ok: true } },
    });
  });

  it('rejects malformed payload JSON before calling the API', () => {
    expect(() => buildMirariTestSignalPayload({
      kind: 'drift',
      severity: '2',
      summary: 'Bad payload',
      payloadJson: '{bad',
    })).toThrow('Payload JSON must be valid JSON');
  });

  it('keeps long Mirari results constrained inside the wallet panel', () => {
    expect(MIRARI_LAYOUT_GRID_CLASSNAME).toContain('min-w-0');
    expect(MIRARI_LAYOUT_GRID_CLASSNAME).toContain('minmax(0,0.95fr)');
    expect(MIRARI_LAYOUT_GRID_CLASSNAME).toContain('minmax(0,1.05fr)');
    expect(MIRARI_RESULT_PANEL_CLASSNAME).toContain('min-w-0');
    expect(MIRARI_RESULT_PANEL_CLASSNAME).toContain('overflow-hidden');
    expect(MIRARI_RESULT_PRE_CLASSNAME).toContain('max-w-full');
    expect(MIRARI_RESULT_PRE_CLASSNAME).toContain('whitespace-pre-wrap');
    expect(MIRARI_RESULT_PRE_CLASSNAME).toContain('break-words');
  });
});
