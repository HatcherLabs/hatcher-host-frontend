import { describe, expect, it } from 'vitest';

import {
  buildMedusaBadgeUrl,
  formatMedusaRequirement,
  getMedusaPrimaryActionLabel,
  humanizeMedusaError,
  parseMedusaPassportJson,
  shortMedusaValue,
} from './MedusaWalletPanel';

describe('MedusaWalletPanel helpers', () => {
  const passport = {
    type: 'medusa_passport_v1',
    chain: 'solana',
    issuer: 'medusa',
    statement: { policyVersion: 'medusa-passport-v1' },
    nullifier: '4effa36ce65d08b0f7dc6da6186e100e82b62452aa175288ea07d988d63ebf50',
    signature: 'signature',
  };

  it('parses a Medusa Solana passport JSON object', () => {
    expect(parseMedusaPassportJson(JSON.stringify(passport))).toEqual(passport);
  });

  it('rejects unrelated JSON objects', () => {
    expect(() => parseMedusaPassportJson(JSON.stringify({ type: 'other' }))).toThrow(
      'This does not look like a Medusa Solana passport.',
    );
  });

  it('turns duplicate/nullifier errors into user-facing copy', () => {
    expect(humanizeMedusaError('409 duplicate nullifier')).toContain('already used');
  });

  it('shortens long values for receipts and dropdown labels', () => {
    expect(shortMedusaValue('ESbGCiveNEWmSRnW9quAo5XU7BUzkk2j1ZyacdFA7zAs')).toBe('ESbGCive...FA7zAs');
  });

  it('describes tier as a campaign requirement instead of a user-selected value', () => {
    expect(formatMedusaRequirement(2)).toBe('Campaign requirement: Silver or better');
  });

  it('builds a Solscan badge URL from a cNFT asset id', () => {
    expect(buildMedusaBadgeUrl('4ReNBmSKaa5u3gemPeLVESgnFxiezLBU5sXMHBu5R1Q8')).toBe(
      'https://solscan.io/token/4ReNBmSKaa5u3gemPeLVESgnFxiezLBU5sXMHBu5R1Q8',
    );
  });

  it('uses rotate copy only after a saved registration exists', () => {
    expect(getMedusaPrimaryActionLabel(false)).toBe('Register for presale');
    expect(getMedusaPrimaryActionLabel(true)).toBe('Rotate claim wallet');
  });
});
