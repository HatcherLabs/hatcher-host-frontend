"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadCanvasMedia,
  loadCanvasMedia,
  type CanvasMediaKind,
} from "@/lib/canvas-media";
import styles from "./CanvasMedia.module.css";

/** Load private media with authentication for both preview and download. */
export default function CanvasMedia({
  path,
  kind,
  title,
}: {
  path: string;
  kind: CanvasMediaKind;
  title: string;
}) {
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const objectUrl = useRef<string | undefined>(undefined);
  const media = useRef<Blob | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  const load = useCallback(async () => {
    if (request.current) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const blob = await loadCanvasMedia(path, kind, controller.signal);
      if (controller.signal.aborted) return;
      media.current = blob;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setUrl(objectUrl.current);
    } catch (failure) {
      if (!controller.signal.aborted) setError((failure as Error).message);
    } finally {
      if (request.current === controller) request.current = undefined;
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [path, kind]);
  useEffect(() => {
    setUrl(undefined);
    setError("");
    setBusy(false);
    if (kind === "image") void load();
    return () => {
      request.current?.abort();
      request.current = undefined;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = undefined;
      media.current = undefined;
    };
  }, [path, kind, load]);
  function download() {
    if (!media.current) return;
    try {
      downloadCanvasMedia(media.current, path);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  const playbackError = () =>
    setError(
      "This browser could not play the file. Try downloading it; do not generate it again.",
    );
  return (
    <div className={styles.root}>
      {url ? (
        <>
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- Authenticated private media is loaded as a blob.
            <img src={url} alt={title} />
          ) : kind === "video" ? (
            <video
              controls
              controlsList="nodownload"
              preload="metadata"
              onError={playbackError}
              src={url}
              aria-label={title}
            />
          ) : (
            <audio
              controls
              controlsList="nodownload"
              preload="metadata"
              onError={playbackError}
              src={url}
              aria-label={title}
            />
          )}
          <button className={styles.action} onClick={download}>
            Download {kind === "audio" ? "music" : kind}
          </button>
        </>
      ) : (
        <button
          className={styles.action}
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? "Loading…" : `Load ${kind === "audio" ? "music" : kind}`}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
