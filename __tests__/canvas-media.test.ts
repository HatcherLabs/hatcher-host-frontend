import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/core", () => ({ getToken: () => "test-token" }));
vi.mock("@/lib/config", () => ({ API_URL: "https://api.example.test" }));
import { downloadCanvasMedia, loadCanvasMedia } from "@/lib/canvas-media";
const path = "/chat/create/content/32763276-467c-4c8a-919b-562b60133492";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("private Canvas media", () => {
  it.each([
    ["image", "image/png"],
    ["audio", "audio/flac"],
    ["video", "video/mp4"],
  ] as const)("loads %s through the authenticated API", async (kind, mime) => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(new Blob(["media"], { type: mime })));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    const blob = await loadCanvasMedia(path, kind, signal);
    expect(blob.type).toBe(mime);
    expect(fetch).toHaveBeenCalledWith("https://api.example.test" + path, {
      credentials: "include",
      signal,
      headers: { Authorization: "Bearer test-token" },
    });
  });
  it("never forwards credentials to an arbitrary media URL", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      loadCanvasMedia(
        "https://evil.test/file",
        "image",
        new AbortController().signal,
      ),
    ).rejects.toThrow("Invalid creation link");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects expired authentication and non-media responses", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(
        new Response("error", { headers: { "Content-Type": "text/html" } }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      loadCanvasMedia(path, "audio", new AbortController().signal),
    ).rejects.toThrow("Sign in again");
    await expect(
      loadCanvasMedia(path, "audio", new AbortController().signal),
    ).rejects.toThrow("format");
  });
  it.each([
    ["audio/flac", "flac"],
    ["image/png", "png"],
    ["video/mp4", "mp4"],
  ])(
    "downloads %s with an independent URL and correct extension",
    (mime, extension) => {
      vi.useFakeTimers();
      const anchor = {
        href: "",
        download: "",
        style: { display: "" },
        click: vi.fn(),
        remove: vi.fn(),
      };
      const append = vi.fn();
      vi.stubGlobal("document", {
        createElement: () => anchor,
        body: { appendChild: append },
      });
      const create = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:download-owned");
      const revoke = vi
        .spyOn(URL, "revokeObjectURL")
        .mockImplementation(() => {});
      const blob = new Blob(["file"], { type: mime });
      downloadCanvasMedia(blob, path);
      expect(create).toHaveBeenCalledWith(blob);
      expect(anchor.href).toBe("blob:download-owned");
      expect(anchor.download).toBe(
        "hatcher-32763276-467c-4c8a-919b-562b60133492." + extension,
      );
      expect(append.mock.invocationCallOrder[0]).toBeLessThan(
        anchor.click.mock.invocationCallOrder[0]!,
      );
      // The preview's cleanup does not invalidate the independent download.
      URL.revokeObjectURL("blob:preview");
      vi.advanceTimersByTime(1000);
      expect(revoke).not.toHaveBeenCalledWith("blob:download-owned");
      vi.advanceTimersByTime(59000);
      expect(revoke).toHaveBeenCalledWith("blob:download-owned");
    },
  );
});
