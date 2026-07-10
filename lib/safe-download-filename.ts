export const MAX_DOWNLOAD_FILENAME_LENGTH = 160;

const RESERVED_FILENAME_CHARACTERS = new Set(['"', '\\', '/', ':', '*', '?', '<', '>', '|']);

function isUnsafeFilenameCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    codePoint <= 0x1f
    || codePoint === 0x7f
    || character.trim() === ''
    || RESERVED_FILENAME_CHARACTERS.has(character)
  );
}

export function safeDownloadFilename(value: string, maxLength = MAX_DOWNLOAD_FILENAME_LENGTH): string {
  const boundedLength = Math.max(1, Math.min(maxLength, MAX_DOWNLOAD_FILENAME_LENGTH));
  let sanitized = '';
  let firstContentIndex = -1;
  let lastContentEnd = 0;

  for (const character of value) {
    const next = isUnsafeFilenameCharacter(character) ? '-' : character;
    if (sanitized.length + next.length > boundedLength) break;

    if (next !== '-' && firstContentIndex < 0) firstContentIndex = sanitized.length;
    sanitized += next;
    if (next !== '-') lastContentEnd = sanitized.length;
  }

  return firstContentIndex >= 0
    ? sanitized.slice(firstContentIndex, lastContentEnd)
    : 'artifact';
}
