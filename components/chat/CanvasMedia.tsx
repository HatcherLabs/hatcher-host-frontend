"use client";
import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/api/core";
import styles from "./CanvasMedia.module.css";
import { API_URL } from "@/lib/config";

/** Load private media on demand; keep authentication out of downloadable URLs. */
export default function CanvasMedia({
  path,
  kind,
  title,
}: {
  path: string;
  kind: "video" | "audio";
  title: string;
}) {
  const [url, setUrl] = useState<string>();
  const [extension, setExtension] = useState(kind === "video" ? "mp4" : "mp3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const objectUrl = useRef<string | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    setUrl(undefined);
    setError("");
    setBusy(false);
    return () => {
      request.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = undefined;
    };
  }, [path, kind]);
  async function load() {
    if (busy) return;
    if (!/^\/chat\/create\/content\/[0-9a-f-]{36}$/i.test(path)) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}${path}`, {
        credentials: "include",
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Sign in again to play this creation."
            : "Unable to load this creation. Please retry.",
        );
      const blob = await response.blob();
      if (!blob.type.startsWith(kind + "/"))
        throw new Error("This media format is unavailable.");
      if (controller.signal.aborted) return;
      setExtension(
        blob.type === "audio/wav" ? "wav" : kind === "video" ? "mp4" : "mp3",
      );
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setUrl(objectUrl.current);
    } catch (failure) {
      if (!controller.signal.aborted) setError((failure as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className={styles.root}>
      {url ? (
        <>
          {kind === "video" ? (
            <video
              controls
              preload="metadata"
              onError={() =>
                setError(
                  "This browser could not play the file. Try downloading it; do not generate it again.",
                )
              }
              src={url}
              aria-label={title}
            />
          ) : (
            <audio
              controls
              preload="metadata"
              onError={() =>
                setError(
                  "This browser could not play the file. Try downloading it; do not generate it again.",
                )
              }
              src={url}
              aria-label={title}
            />
          )}
          <a
            className={styles.action}
            href={url}
            download={`hatcher-${path.split("/").pop()}.${extension}`}
          >
            Download {kind === "audio" ? "music" : "video"}
          </a>
        </>
      ) : (
        <button
          className={styles.action}
          disabled={busy}
          onClick={() => void load()}
        >
          {busy
            ? "Loading…"
            : `Play or download ${kind === "audio" ? "music" : "video"}`}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
