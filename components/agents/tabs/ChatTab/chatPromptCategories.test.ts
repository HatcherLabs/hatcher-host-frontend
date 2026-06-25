import { describe, expect, it } from 'vitest';
import { CHAT_PROMPT_CATEGORIES } from './chatPromptCategories';

describe('chat prompt categories', () => {
  it('offers task starters for core agent work modes', () => {
    expect(CHAT_PROMPT_CATEGORIES.map((category) => category.id)).toEqual([
      'jobs',
      'productivity',
      'wallet',
      'trading',
    ]);
  });

  it('keeps every category actionable with three prompts', () => {
    expect(CHAT_PROMPT_CATEGORIES.every((category) => category.prompts.length === 3)).toBe(true);
    expect(CHAT_PROMPT_CATEGORIES.find((category) => category.id === 'wallet')?.prompts).toContain(
      'Show my agent wallet balances and recent transaction activity',
    );
  });
});
