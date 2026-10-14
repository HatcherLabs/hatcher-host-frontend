import { describe, expect, it } from "vitest";
import { studioKind, studioMediaUrls } from "@/lib/studio";

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
    expect(studioMediaUrls("Creating video…")).toEqual([]);
  });
});
