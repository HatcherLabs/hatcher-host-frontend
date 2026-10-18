"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Maximize2, Minimize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChatTurn } from "@/lib/direct-chat";
import { resultTitle } from "@/lib/chat-workspace";
import { RichMarkdown } from "@/components/agents/tabs/ChatTab/ArtifactRenderer";
import styles from "./ChatExperience.module.css";
export function ChatResultPanel({
  turn,
  onClose,
}: {
  turn: ChatTurn;
  onClose: () => void;
}) {
  const t = useTranslations("chatExperience");
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLElement>(null);
  const [view, setView] = useState("preview");
  useEffect(() => {
    const media = matchMedia("(max-width: 1100px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key !== "Tab" || (!mobile && !expanded)) return;
      const all = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button,select,a[href],[tabindex="0"]',
        ) || [],
      ).filter((e) => e.getClientRects().length);
      const first = all[0],
        last = all[all.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [mobile, expanded, onClose]);
  const code = turn.response.match(/```([^\n]*)\n([\s\S]*?)```/);
  const content = view === "code" && code ? code[2] : turn.response;
  const download = () => {
    const ext =
      view === "code" && code
        ? {
            javascript: "js",
            typescript: "ts",
            python: "py",
            html: "html",
            css: "css",
            json: "json",
          }[code[1].trim()] || "txt"
        : "md";
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `hatcher-result.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      {(mobile || expanded) && (
        <button
          className={styles.resultScrim}
          aria-label={t("closeResult")}
          onClick={onClose}
        />
      )}
      <aside
        ref={panel}
        tabIndex={-1}
        className={`${styles.resultPanel} ${expanded ? styles.resultExpanded : ""}`}
        role={mobile || expanded ? "dialog" : "region"}
        aria-modal={mobile || expanded ? true : undefined}
        aria-label={t("resultPanel")}
      >
        <div className={styles.resultHeader}>
          <strong>{resultTitle(turn)}</strong>
          <div>
            <button
              aria-label={t("copyResult")}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(content);
                  setCopied(true);
                } catch {
                  setError(t("copyError"));
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button aria-label={t("downloadResult")} onClick={download}>
              <Download size={16} />
            </button>
            <button
              aria-label={t(expanded ? "collapseResult" : "expandResult")}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button aria-label={t("closeResult")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={styles.resultTabs}>
          <button
            aria-pressed={view === "preview"}
            onClick={() => setView("preview")}
          >
            {t("preview")}
          </button>
          <button
            aria-pressed={view === "markdown"}
            onClick={() => setView("markdown")}
          >
            Markdown
          </button>
          {code && (
            <button
              aria-pressed={view === "code"}
              onClick={() => setView("code")}
            >
              {t("code")}
            </button>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        <div className={styles.resultBody}>
          {view === "preview" ? (
            <RichMarkdown content={turn.response} />
          ) : (
            <pre>
              <code>{content}</code>
            </pre>
          )}
        </div>
      </aside>
    </>
  );
}
