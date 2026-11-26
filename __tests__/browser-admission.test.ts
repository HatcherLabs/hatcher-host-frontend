import { describe, expect, it } from 'vitest';
import { admissionAction } from '../lib/browser-admission';
describe('browser admission routing', () => {
  it.each(['/agents', '/agents/', '/agents/a/port', '/agents/backups/b/restore'])('requires creation admission for %s', path => {
    expect(admissionAction(path, 'POST')).toBe('create_agent');
  });
  it('requires signup admission', () => expect(admissionAction('/auth/register', 'POST')).toBe('register'));
  it.each(['/auth/login', '/agents/a/chat', '/agents/a/start', '/agents/a/stop'])('leaves existing operations unchanged: %s', path => {
    expect(admissionAction(path, 'POST')).toBeNull();
  });
  it('does not challenge reads', () => expect(admissionAction('/agents', 'GET')).toBeNull());
});
