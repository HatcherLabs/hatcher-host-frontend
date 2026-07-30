import { describe, expect, it } from 'vitest';
import { isPrivateClientPath, makePrivateDestination } from '../privatePaths';

describe('isPrivateClientPath', () => {
  it('marks paths with a segment equal to "private" as private', () => {
    expect(isPrivateClientPath('/ws/private')).toBe(true);
    expect(isPrivateClientPath('/ws/private/report.pdf')).toBe(true);
    expect(isPrivateClientPath('/ws/docs/private/x.pdf')).toBe(true);
  });

  it('matches the "private" segment case-insensitively', () => {
    expect(isPrivateClientPath('/ws/Private/x.pdf')).toBe(true);
    expect(isPrivateClientPath('/ws/PRIVATE')).toBe(true);
  });

  it('marks paths with a dot-prefixed segment as private', () => {
    expect(isPrivateClientPath('/ws/.env')).toBe(true);
    expect(isPrivateClientPath('/ws/.config/settings.json')).toBe(true);
  });

  it('requires the segment to EQUAL "private", not merely contain it', () => {
    expect(isPrivateClientPath('/ws/privateer/x.pdf')).toBe(false);
    expect(isPrivateClientPath('/ws/my.private')).toBe(false);
  });

  it('leaves ordinary paths public', () => {
    expect(isPrivateClientPath('/ws/docs/x.pdf')).toBe(false);
    expect(isPrivateClientPath('/ws')).toBe(false);
  });
});

describe('makePrivateDestination', () => {
  it('moves a file into a sibling private folder', () => {
    expect(makePrivateDestination('/ws/docs/x.pdf')).toEqual({
      dir: '/ws/docs/private',
      to: '/ws/docs/private/x.pdf',
    });
  });

  it('works for entries directly under the workspace root', () => {
    expect(makePrivateDestination('/ws/x.pdf')).toEqual({
      dir: '/ws/private',
      to: '/ws/private/x.pdf',
    });
  });
});
