import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

/** Documents larger than this fall back to the plain textarea — CodeMirror
 *  degrades badly on very large documents. */
export const MAX_CODE_EDITOR_SIZE = 1024 * 1024; // 1 MB

/** Resolve the CodeMirror language description for a filename (by extension
 *  or filename pattern). Returns null when no language matches. */
export function findLanguage(filename: string): LanguageDescription | null {
  if (!filename) return null;
  return LanguageDescription.matchFilename(languages, filename);
}

/** Human-readable language name for a filename ("TypeScript", "Markdown", …). */
export function languageNameForFilename(filename: string): string | null {
  return findLanguage(filename)?.name ?? null;
}

const NUL = 0x0000;
const REPLACEMENT_CHAR = 0xfffd; // U+FFFD, common when binary is decoded as text
const TAB = 9;
const LF = 10;
const CR = 13;

/** Heuristic: content that looks binary (NUL bytes, or a high ratio of
 *  replacement/control characters) should not be fed to a code editor. */
export function looksBinary(content: string): boolean {
  if (content.includes(String.fromCharCode(NUL))) return true;
  const sample = content.slice(0, 8192);
  if (!sample) return false;
  let suspicious = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === REPLACEMENT_CHAR || (code < 32 && code !== LF && code !== CR && code !== TAB)) {
      suspicious++;
    }
  }
  return suspicious / sample.length > 0.05;
}

/** Gate: whether the rich CodeMirror editor should be used for this document,
 *  or the caller should keep its plain-textarea fallback. */
export function shouldUseCodeEditor(content: string): boolean {
  return content.length <= MAX_CODE_EDITOR_SIZE && !looksBinary(content);
}
