import { describe, expect, it } from 'vitest';
import {
  MAX_CODE_EDITOR_SIZE,
  languageNameForFilename,
  looksBinary,
  shouldUseCodeEditor,
} from './code-editor-utils';

describe('languageNameForFilename', () => {
  it('maps common agent-file extensions to the right language', () => {
    expect(languageNameForFilename('index.ts')).toBe('TypeScript');
    expect(languageNameForFilename('bot.js')).toBe('JavaScript');
    expect(languageNameForFilename('main.py')).toBe('Python');
    expect(languageNameForFilename('openclaw.json')).toBe('JSON');
    expect(languageNameForFilename('SOUL.md')).toBe('Markdown');
    expect(languageNameForFilename('config.yaml')).toBe('YAML');
    expect(languageNameForFilename('run.sh')).toBe('Shell');
  });

  it('returns null when no language matches', () => {
    expect(languageNameForFilename('.env')).toBeNull();
    expect(languageNameForFilename('noextension')).toBeNull();
    expect(languageNameForFilename('')).toBeNull();
  });
});

describe('looksBinary', () => {
  const NUL = String.fromCharCode(0);
  const REPLACEMENT = String.fromCharCode(0xfffd);

  it('flags content containing NUL bytes', () => {
    expect(looksBinary(`hello${NUL}world`)).toBe(true);
  });

  it('flags content dominated by replacement characters', () => {
    expect(looksBinary(REPLACEMENT.repeat(100))).toBe(true);
  });

  it('accepts ordinary text with newlines and tabs', () => {
    expect(looksBinary('normal text\nwith lines\tand tabs\r\n')).toBe(false);
    expect(looksBinary('')).toBe(false);
  });
});

describe('shouldUseCodeEditor', () => {
  it('accepts documents up to the 1MB cap and rejects larger ones', () => {
    expect(shouldUseCodeEditor('a'.repeat(MAX_CODE_EDITOR_SIZE))).toBe(true);
    expect(shouldUseCodeEditor('a'.repeat(MAX_CODE_EDITOR_SIZE + 1))).toBe(false);
  });

  it('rejects binary-looking content', () => {
    expect(shouldUseCodeEditor(`PNG${String.fromCharCode(0)}...`)).toBe(false);
  });

  it('accepts a typical config file', () => {
    expect(shouldUseCodeEditor('{\n  "model": "claude"\n}\n')).toBe(true);
  });
});
