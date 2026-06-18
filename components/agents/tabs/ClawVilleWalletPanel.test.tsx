import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/ui/ToastProvider';
import {
  CLAWVILLE_SPECIES_OPTIONS,
  ClawVilleWalletPanel,
  clampClawVilleStatValue,
  describeClawVilleLaunchError,
  validateClawVilleStatsInput,
} from './ClawVilleWalletPanel';

describe('ClawVilleWalletPanel', () => {
  it('renders constrained avatar setup controls without staging copy', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <ClawVilleWalletPanel agentId="agent-1" />
      </ToastProvider>,
    );

    expect(html).toContain('Species');
    expect(html).toContain('Phanes');
    expect(html).toContain('Hatcher 8');
    expect(html).toContain('Personality preset');
    expect(html).toContain('title="1-500"');
    expect(html).not.toMatch(/staging/i);
  });

  it('clamps ClawVille stat values to server limits', () => {
    expect(clampClawVilleStatValue('hp', 0)).toBe(1);
    expect(clampClawVilleStatValue('hp', 999)).toBe(500);
    expect(clampClawVilleStatValue('attack', 0)).toBe(1);
    expect(clampClawVilleStatValue('attack', 999)).toBe(100);
    expect(clampClawVilleStatValue('speed', Number.NaN)).toBe(1);
  });

  it('validates stat text before building a numeric payload', () => {
    expect(validateClawVilleStatsInput({
      hp: '500',
      attack: '1',
      defense: '75',
      speed: '100',
    })).toEqual({
      ok: true,
      stats: { hp: 500, attack: 1, defense: 75, speed: 100 },
    });

    expect(validateClawVilleStatsInput({
      hp: '501',
      attack: '1',
      defense: '75',
      speed: '100',
    })).toEqual({ ok: false, error: 'HP must be between 1 and 500.' });

    expect(validateClawVilleStatsInput({
      hp: '100',
      attack: 'abc',
      defense: '75',
      speed: '100',
    })).toEqual({ ok: false, error: 'Attack must be a whole number.' });
  });

  it('renders plain stat text inputs without increment controls', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <ClawVilleWalletPanel agentId="agent-1" />
      </ToastProvider>,
    );

    expect(html).not.toContain('type="number"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).not.toContain('Increase hp');
    expect(html).not.toContain('Decrease hp');
  });

  it('offers only known Hatcher avatar species keys', () => {
    expect(CLAWVILLE_SPECIES_OPTIONS.map((option) => option.value)).toEqual([
      'phanes',
      'hatcher_1',
      'hatcher_2',
      'hatcher_3',
      'hatcher_4',
      'hatcher_5',
      'hatcher_6',
      'hatcher_7',
      'hatcher_8',
    ]);
  });

  it('maps missing prod avatar launch errors to a re-register action', () => {
    expect(describeClawVilleLaunchError('not_found', 'CLAWVILLE_UPSTREAM_FAILED')).toContain('Re-register');
  });
});
