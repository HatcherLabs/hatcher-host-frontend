import type { ChatMsg } from './types';

/** Merge persisted pages by identity, retaining earlier pages during polling. */
export function mergeChatHistory(existing: ChatMsg[], incoming: ChatMsg[]): ChatMsg[] {
  const messages = new Map(existing.map(message => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) =>
    (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
