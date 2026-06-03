const PUBLIC_CHAT_USERNAME_MAX_LENGTH = 40;
const UNSAFE_USERNAME_CHARS_RE = /[<>"'`&]/g;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const WHITESPACE_RE = /\s+/g;

export function sanitizePublicChatUsername(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(UNSAFE_USERNAME_CHARS_RE, '')
    .replace(WHITESPACE_RE, ' ')
    .trim()
    .slice(0, PUBLIC_CHAT_USERNAME_MAX_LENGTH);
}
