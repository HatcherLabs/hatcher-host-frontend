import type { ChatTurn, Conversation } from "./direct-chat";
export type TextAttachment = { name: string; content: string };
export type ChatDraft = { text: string; attachments: TextAttachment[] };
export const EMPTY_DRAFT: ChatDraft = { text: "", attachments: [] };
export function draftKey(userId: string, conversationId: string | null) {
  return `hatcher.chat.draft.v2:${userId}:${conversationId ?? "new"}`;
}
export function readDraft(key: string): ChatDraft {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (value && typeof value.text === "string")
      return {
        text: value.text,
        attachments: Array.isArray(value.attachments)
          ? value.attachments.filter(
              (f: TextAttachment) =>
                typeof f.name === "string" && typeof f.content === "string",
            )
          : [],
      };
  } catch {}
  return EMPTY_DRAFT;
}
export function writeDraft(key: string, value: ChatDraft) {
  try {
    if (!value.text && !value.attachments.length)
      sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
export function conversationHref(id: string | null) {
  return `/dashboard/chat${id ? `?conversation=${encodeURIComponent(id)}` : ""}`;
}
export function messageWithAttachments(text: string, files: TextAttachment[]) {
  return [
    text.trim(),
    ...files.map(
      (file) =>
        `\n--- Attached text file: ${file.name} ---\n${file.content}\n--- End file ---`,
    ),
  ].join("\n");
}
export function historyGroup(chat: Conversation, now = new Date()) {
  if (chat.isPinned) return "pinned";
  const date = new Date(chat.updatedAt || chat.createdAt || 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date >= today) return "today";
  if (date >= yesterday) return "yesterday";
  return "earlier";
}
export function handoffText(turns: ChatTurn[], scope: "last" | "all") {
  const chosen = scope === "last" ? turns.slice(-1) : turns;
  return chosen
    .map((turn) => `User:\n${turn.prompt}\n\nAssistant:\n${turn.response}`)
    .join("\n\n---\n\n");
}
export function resultTitle(turn: ChatTurn) {
  return (
    turn.response.match(/^#{1,3}\s+(.+)$/m)?.[1]?.slice(0, 80) ||
    turn.prompt.replace(/\s+/g, " ").slice(0, 64) ||
    "Result"
  );
}
export function readHandoff(
  userId: string,
  id: string,
  target: string,
): { text: string; title: string } | null {
  try {
    const key = `hatcher.chat.handoff.v1:${userId}:${id}`;
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      !value ||
      value.target !== target ||
      typeof value.text !== "string" ||
      value.expires < Date.now()
    )
      return null;
    sessionStorage.removeItem(key);
    return {
      text: value.text,
      title: typeof value.title === "string" ? value.title : "",
    };
  } catch {
    return null;
  }
}
