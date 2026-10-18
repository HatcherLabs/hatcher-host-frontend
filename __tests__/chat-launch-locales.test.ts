import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { locales } from '../i18n/config';
import { workspaceSection, isWorkspacePath } from '../components/workspace/navigation';
const read = (locale: string) => JSON.parse(readFileSync(new URL('../messages/' + locale + '.json', import.meta.url), 'utf8'));
describe('public chat launch', () => {
  it('gives every localized landing the chat workspace and preserves the full website', () => {
    for (const locale of locales) {
      expect(isWorkspacePath('/' + locale)).toBe(true);
      expect(workspaceSection('/' + locale, null)).toBe('chats');
      expect(workspaceSection('/' + locale, null, 'canvas')).toBe('canvas');
      expect(isWorkspacePath('/' + locale + '/platform')).toBe(false);
    }
  });
  it.each(locales)('has complete UI messages and matching placeholders for %s', (locale) => {
    const english = read('en'), translated = read(locale);
    for (const namespace of ['workspace','chatExperience','chatEntry']) {
      expect(Object.keys(translated[namespace]).sort()).toEqual(Object.keys(english[namespace]).sort());
      for (const [key, value] of Object.entries(english[namespace])) {
        const text = translated[namespace][key];
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
        expect(text.match(/\{\w+\}/g)?.sort() ?? []).toEqual((value as string).match(/\{\w+\}/g)?.sort() ?? []);
      }
    }
    if (locale !== 'en') {
      expect(translated.chatExperience.welcome).not.toBe(english.chatExperience.welcome);
      expect(translated.chatEntry.fullWebsite).not.toBe(english.chatEntry.fullWebsite);
    }
  });
});
