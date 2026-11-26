"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WorkspaceShell.module.css";

const KEY = "hatcher.workspace.sidebar-width.v1";
const MIN = 240;
const MAX = 480;
const DEFAULT = 304;
const clamp = (value: number) => Math.max(MIN, Math.min(MAX, value));

/** Pointer capture keeps dragging bounded and keyboard arrows expose the same control. */
export function SidebarResizer() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [width, setWidth] = useState(DEFAULT);
  useEffect(() => {
    let value = DEFAULT;
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (Number.isFinite(saved) && saved >= MIN && saved <= MAX) value = saved;
    } catch { /* Resizing also works without storage. */ }
    setWidth(value);
    ref.current?.closest<HTMLElement>("[data-workspace-shell]")?.style.setProperty("--panel-width", `${value}px`);
  }, []);
  const update = (next: number, persist = true) => {
    const value = clamp(next);
    setWidth(value);
    ref.current?.closest<HTMLElement>("[data-workspace-shell]")?.style.setProperty("--panel-width", `${value}px`);
    if (persist) try { localStorage.setItem(KEY, String(value)); } catch { /* optional */ }
  };
  return <div ref={ref} role="separator" tabIndex={0} aria-orientation="vertical"
    aria-label="Resize sidebar" aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={width}
    title="Drag to resize sidebar. Use arrow keys, or double-click to reset."
    className={styles.sidebarResizer} style={{ touchAction: "none" } as CSSProperties}
    onPointerDown={event => {
      if (event.button !== 0) return;
      drag.current = { x: event.clientX, width };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    }}
    onPointerMove={event => { if (drag.current) update(drag.current.width + event.clientX - drag.current.x, false); }}
    onPointerUp={event => {
      if (!drag.current) return;
      update(drag.current.width + event.clientX - drag.current.x);
      drag.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onLostPointerCapture={() => { drag.current = null; }}
    onDoubleClick={() => update(DEFAULT)}
    onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      update(event.key === "Home" ? MIN : event.key === "End" ? MAX : width + (event.key === "ArrowRight" ? 16 : -16));
    }}
  />;
}
