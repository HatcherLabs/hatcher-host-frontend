import { describe, expect, it } from 'vitest';

import {
  MIRARI_LAYOUT_GRID_CLASSNAME,
  MIRARI_PANEL_COPY,
  MIRARI_RESULT_PANEL_CLASSNAME,
  MIRARI_RESULT_PRE_CLASSNAME,
  buildMirariConnectionCheckPayload,
  buildMirariDreamPayload,
} from './MirariWalletPanel';

describe('Mirari wallet panel helpers', () => {
  it('builds a user-facing Mirari connection check payload', () => {
    expect(buildMirariConnectionCheckPayload({
      summary: ' Mirror this agent activity ',
    })).toEqual({
      kind: 'focus_hit',
      severity: 3,
      summary: 'Mirror this agent activity',
      payload: { source: 'hatcher-dashboard', action: 'connection_check' },
    });
  });

  it('builds a user-facing Mirari dream session payload', () => {
    expect(buildMirariDreamPayload({
      mode: 'consolidate',
      summary: ' Consolidate the last memory window ',
      findingTitle: ' Memory links look stable ',
    })).toEqual({
      mode: 'consolidate',
      trigger: 'manual',
      status: 'complete',
      summary: 'Consolidate the last memory window',
      findings: [{
        kind: 'insight',
        severity: 'medium',
        title: 'Memory links look stable',
        target_ref: { source: 'hatcher-dashboard', action: 'dream_check' },
      }],
    });
  });

  it('keeps integration copy user-facing instead of exposing transport internals', () => {
    const copy = Object.values(MIRARI_PANEL_COPY).join(' ').toLowerCase();
    expect(copy).not.toContain('smoke');
    expect(copy).not.toContain('hmac');
    expect(copy).not.toContain('grant');
    expect(copy).not.toContain('payload');
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
