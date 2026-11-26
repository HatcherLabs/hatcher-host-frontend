import { getToken } from "@/lib/api/core";
import { API_URL } from "@/lib/config";

export type CanvasMediaKind = "image" | "audio" | "video";
const privatePath = /^\/chat\/create\/content\/([0-9a-f-]{36})$/i;
const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export async function loadCanvasMedia(
  path: string,
  kind: CanvasMediaKind,
  signal: AbortSignal,
) {
  if (!privatePath.test(path)) throw new Error("Invalid creation link.");
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Sign in again to access this creation."
        : "Unable to load this creation. Please retry.",
    );
  const blob = await response.blob();
  if (!blob.size || !blob.type.startsWith(kind + "/") || !extensions[blob.type])
    throw new Error("This media format is unavailable.");
  return blob;
}

/** A download owns its URL: closing/changing the preview must not revoke it. */
export function downloadCanvasMedia(blob: Blob, path: string) {
  const id = privatePath.exec(path)?.[1];
  const extension = extensions[blob.type];
  if (!id || !extension || !blob.size)
    throw new Error("This media format is unavailable.");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hatcher-${id}.${extension}`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Chromium starts downloads asynchronously; preserve this URL after the UI unmounts.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
