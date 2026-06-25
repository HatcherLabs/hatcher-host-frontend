import { describe, expect, it } from 'vitest';
import {
  AVATAR_SELECT_CLASSNAME,
  AVATAR_SELECT_OPTION_CLASSNAME,
  AVATAR_SELECT_STYLE,
} from './avatarSelectTheme';

describe('avatar select theme styles', () => {
  it('uses theme-aware text/background instead of a forced dark native select', () => {
    expect(AVATAR_SELECT_STYLE).toEqual({ colorScheme: 'normal' });
    expect(AVATAR_SELECT_CLASSNAME).toContain('text-[var(--text-primary)]');
    expect(AVATAR_SELECT_CLASSNAME).toContain('bg-[var(--bg-elevated)]');
    expect(AVATAR_SELECT_OPTION_CLASSNAME).toContain('text-[var(--text-primary)]');
    expect(AVATAR_SELECT_OPTION_CLASSNAME).toContain('bg-[var(--bg-elevated)]');
  });
});
