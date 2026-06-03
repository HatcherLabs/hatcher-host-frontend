import { describe, expect, it } from 'vitest';
import { sanitizePublicChatUsername } from '../lib/public-chat-username';

describe('public chat username sanitization', () => {
  it('removes HTML-sensitive and control characters before DOM use', () => {
    expect(sanitizePublicChatUsername('  <img src=x onerror=alert(1)> Alice & Bob  ')).toBe(
      'img src=x onerror=alert(1) Alice Bob',
    );
    expect(sanitizePublicChatUsername('xss_canary_test123')).toBe('xss_canary_test123');
  });

  it('caps display names to the public chat maximum length', () => {
    expect(sanitizePublicChatUsername('a'.repeat(60))).toHaveLength(40);
  });
});
