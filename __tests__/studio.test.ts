import { describe, expect, it } from "vitest";
import {
  studioKind,
  studioMediaUrls,
  generationModels,
  savedGenerationModel,
} from "@/lib/studio";

describe("Studio saved media", () => {
  it("recognizes only supported generation models", () => {
    expect(studioKind("media/seedance_video")).toBe("video");
    expect(studioKind("media/seedream_image")).toBe("image");
    expect(studioKind("media/suno_audio")).toBe("audio");
    expect(studioKind("my-seedance-text-model")).toBeNull();
  });
  it("keeps safe media links and inline images, rejecting executable and insecure URLs", () => {
    expect(
      studioMediaUrls(
        "![A](https://cdn.example/video.mp4) ![B](https://cdn.example/video.mp4) ![C](data:image/png;base64,YQ==) ![X](javascript:alert) ![Y](data:text/html;base64,YQ==) ![Z](http://example.com/x.png)",
      ),
    ).toEqual(["https://cdn.example/video.mp4", "data:image/png;base64,YQ=="]);
    expect(studioMediaUrls("Creating videoâ€¦")).toEqual([]);
  });
  it("reads both legacy and selected image models in the saved library", () => {
    expect(studioKind("media/image/x-ai/grok-imagine-image-quality")).toBe(
      "image",
    );
    expect(studioKind("media/image/")).toBeNull();
    expect(savedGenerationModel("media/seedream_image")).toBe(
      "bytedance-seed/seedream-4.5",
    );
    expect(
      savedGenerationModel("media/image/x-ai/grok-imagine-image-quality"),
    ).toBe("x-ai/grok-imagine-image-quality");
    expect(savedGenerationModel("media/suno_audio")).toBe("suno_audio");
  });
  it("uses the server catalog and preserves compatibility with older APIs", () => {
    const tool = {
      id: "seedance_video",
      label: "Seedance",
      configured: true,
      estimatedAiCredits: 300,
    };
    expect(generationModels({ tools: [tool] })).toEqual([
      { ...tool, kind: "video", default: true },
    ]);
    expect(generationModels({ tools: [tool], models: [] })).toEqual([]);
    expect(
      generationModels({ tools: [{ ...tool, id: "google_search" }] }),
    ).toEqual([]);
  });
  it("recognizes OpenRouter video and music and only accepts scoped private content paths", () => {
    expect(studioKind("media/video/google/veo-3.1-lite")).toBe("video");
    expect(studioKind("media/audio/google/lyria-3-clip-preview")).toBe("audio");
    expect(savedGenerationModel("media/audio/google/lyria-3-clip-preview")).toBe("google/lyria-3-clip-preview");
    const path = "/chat/create/content/6a719c14-fcde-458a-b5c3-79c4a0d7463c";
    expect(studioMediaUrls(`![music](${path}) ![bad](/admin) ![bad](/chat/create/content/../../admin)`)).toEqual([path]);
  });

});
