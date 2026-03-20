// ============================================================
// Web utility function tests
// Tests: getInitials, timeAgo, stringToColor, shortenAddress, cn
// ============================================================

import { describe, it, expect } from 'vitest';
import { getInitials, timeAgo, stringToColor, shortenAddress } from '../lib/utils.js';

describe('getInitials', () => {
  it('returns initials from two-word name', () => {
    expect(getInitials('Hello World')).toBe('HW');
  });

  it('returns single initial for one word', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('returns up to 2 characters max', () => {
    expect(getInitials('Alpha Beta Gamma')).toBe('AB');
  });

  it('uppercases the result', () => {
    expect(getInitials('foo bar')).toBe('FB');
  });

  it('handles extra whitespace between words', () => {
    expect(getInitials('John   Doe')).toBe('JD');
  });

  it('handles single character name', () => {
    expect(getInitials('X')).toBe('X');
  });
});

describe('timeAgo', () => {
  it('returns "just now" for a very recent date', () => {
    expect(timeAgo(new Date())).toBe('just now');
  });

  it('returns "just now" for a date 30 seconds ago', () => {
    const d = new Date(Date.now() - 30_000);
    expect(timeAgo(d)).toBe('just now');
  });

  it('returns "Xm ago" for a date a few minutes ago', () => {
    const d = new Date(Date.now() - 5 * 60_000);
    expect(timeAgo(d)).toBe('5m ago');
  });

  it('returns "Xh ago" for a date a few hours ago', () => {
    const d = new Date(Date.now() - 3 * 60 * 60_000);
    expect(timeAgo(d)).toBe('3h ago');
  });

  it('returns "Xd ago" for a date a few days ago', () => {
    const d = new Date(Date.now() - 2 * 24 * 60 * 60_000);
    expect(timeAgo(d)).toBe('2d ago');
  });

  it('returns a locale date string for dates older than 30 days', () => {
    const d = new Date(Date.now() - 40 * 24 * 60 * 60_000);
    const result = timeAgo(d);
    // Should be a formatted date, not a relative string
    expect(result).not.toContain('ago');
    expect(result).not.toBe('just now');
  });

  it('accepts a date string', () => {
    const d = new Date(Date.now() - 2 * 60_000);
    expect(timeAgo(d.toISOString())).toBe('2m ago');
  });
});

describe('stringToColor', () => {
  it('returns a string', () => {
    expect(typeof stringToColor('hello')).toBe('string');
  });

  it('returns a gradient class', () => {
    const result = stringToColor('test');
    expect(result).toMatch(/^from-/);
    expect(result).toContain(' to-');
  });

  it('is deterministic — same input always gives same output', () => {
    expect(stringToColor('agent-name')).toBe(stringToColor('agent-name'));
  });

  it('different inputs can give different outputs', () => {
    const colors = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'agent-1', 'agent-2', 'alice', 'bob'].map(stringToColor)
    );
    // At least 2 distinct colors should exist across 11 different inputs
    expect(colors.size).toBeGreaterThan(1);
  });

  it('handles empty string without throwing', () => {
    expect(() => stringToColor('')).not.toThrow();
    expect(typeof stringToColor('')).toBe('string');
  });
});

describe('shortenAddress', () => {
  const ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs';

  it('shortens a Solana address to default 4 chars each side', () => {
    expect(shortenAddress(ADDRESS)).toBe('7xKX...sgAs');
  });

  it('shortens with custom chars', () => {
    expect(shortenAddress(ADDRESS, 6)).toBe('7xKXtg...JosgAs');
  });

  it('contains "..." in the middle', () => {
    expect(shortenAddress(ADDRESS)).toContain('...');
  });

  it('total length is 2*chars + 3 (dots)', () => {
    const chars = 4;
    const result = shortenAddress(ADDRESS, chars);
    expect(result.length).toBe(chars * 2 + 3);
  });
});
