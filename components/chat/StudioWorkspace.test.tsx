// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import StudioWorkspace from "./StudioWorkspace";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/direct-chat", () => ({
  chatRequest: request,
  DEFAULT_CHAT_MODEL: "chat",
}));
vi.mock("@/i18n/routing", () => ({ Link: "a" }));
const params = new URLSearchParams("view=library");
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));

it("animates a library image in portrait with a separately uploaded character sheet", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const rootNode = document.createElement("div");
  const root = createRoot(rootNode);
  const source = {
    id: "saved-image",
    prompt: "Portrait",
    status: "completed",
    model: "media/seedream_image",
    response: "",
  };
  const config = {
    models: [
      {
        id: "venice/kling",
        label: "Kling",
        kind: "video",
        estimatedAiCredits: 100,
        configured: true,
        requiresImage: true,
        characterReference: true,
        aspectRatios: ["16:9", "9:16"],
      },
    ],
  };
  request.mockImplementation(async (path) => {
    if (path.startsWith("/create/config")) return config;
    if (path === "/studio/library")
      return { assets: [source], nextCursor: null };
    if (path === "/account") return { walletBalance: 150 };
    if (path === "/models") return { models: [{ id: "chat" }] };
    if (path === "/conversations") return { id: "conversation" };
    if (path === "/create")
      return {
        turn: { ...source, id: "video", model: "media/video/venice/kling" },
        done: false,
      };
    throw Error(path);
  });
  const button = (label: string) =>
    Array.from(rootNode.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === label,
    )!;
  try {
    await act(async () =>
      root.render(
        <StudioWorkspace
          guest={false}
          onMenu={vi.fn()}
          onPlans={vi.fn()}
          onBusyChange={vi.fn()}
          onAccountChange={vi.fn()}
        />,
      ),
    );
    await act(async () => button("Animate image").click());
    const inputs = rootNode.querySelectorAll("input[type=file]");
    expect(inputs).toHaveLength(2);
    const loaded = new Promise<void>((resolve) => {
      const real = FileReader.prototype.readAsDataURL;
      vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(
        function (this: FileReader, blob) {
          this.addEventListener("loadend", () => resolve(), { once: true });
          real.call(this, blob);
        },
      );
    });
    Object.defineProperty(inputs[1], "files", {
      value: [new File(["sheet"], "character.png", { type: "image/png" })],
    });
    await act(async () => {
      inputs[1]!.dispatchEvent(new Event("change", { bubbles: true }));
      await loaded;
    });
    await act(async () => button("Try an example").click());
    await act(async () => button("Generate video").click());
    const call = request.mock.calls.find(([path]) => path === "/create");
    expect(JSON.parse(call![1].body)).toMatchObject({
      sourceAssetId: "saved-image",
      aspectRatio: "9:16",
      characterImage: "data:image/png;base64,c2hlZXQ=",
    });
  } finally {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
