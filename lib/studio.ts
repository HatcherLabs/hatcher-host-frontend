import type { ChatCreateKind, ChatCreateTool, ChatTurn } from "./direct-chat";

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
  const match = /^media\/(image|video|audio)\/[^/]+\/[^/]+$/.exec(model);
  if (match) return match[1] as ChatCreateKind;
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
      /^\/chat\/create\/content\/[0-9a-f-]{36}$/i.test(url) ||
      /^https:\/\//i.test(url) ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url),
  );
}

export interface GenerationModel extends ChatCreateTool {
  kind: ChatCreateKind;
  description?: string;
  provider?: string;
  default?: boolean;
  requiredAiCredits?: number;
}

/** Allow the UI to roll out alongside older APIs without pretending new models exist. */
export function generationModels(config: {
  models?: GenerationModel[];
  tools: ChatCreateTool[];
}): GenerationModel[] {
  if (config.models) return config.models;
  return config.tools.flatMap((tool) => {
    const kind = (Object.keys(STUDIO_TOOLS) as ChatCreateKind[]).find(
      (key) => STUDIO_TOOLS[key] === tool.id,
    );
    return kind ? [{ ...tool, kind, default: true }] : [];
  });
}

export function savedGenerationModel(model: string): string {
  if (model === "media/seedream_image") return "bytedance-seed/seedream-4.5";
  return model.replace(/^media\/(?:(?:image|video|audio)\/)?/, "");
}
