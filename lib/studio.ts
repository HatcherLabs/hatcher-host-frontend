import type { ChatCreateKind, ChatTurn } from "./direct-chat";

export interface StudioAsset extends ChatTurn {
  conversationId: string;
  createdAt: string;
}

export const STUDIO_TOOLS: Record<ChatCreateKind, string> = {
  image: "seedream_image",
  video: "seedance_video",
  audio: "suno_audio",
};

export function studioKind(model: string): ChatCreateKind | null {
  return (
    (Object.keys(STUDIO_TOOLS) as ChatCreateKind[]).find(
      (kind) => model === `media/${STUDIO_TOOLS[kind]}`,
    ) ?? null
  );
}

/** Only render media URLs from saved generation output, never arbitrary markup. */
export function studioMediaUrls(response: string): string[] {
  return [
    ...new Set(
      Array.from(
        response.matchAll(/!\[[^\]]*\]\(([^\s]+)\)/g),
        (match) => match[1],
      ),
    ),
  ].filter(
    (url) =>
      /^https:\/\//i.test(url) ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url),
  );
}
