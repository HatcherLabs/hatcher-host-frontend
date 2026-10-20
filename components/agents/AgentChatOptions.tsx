"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "@/components/workspace/WorkspaceShell.module.css";

export function AgentChatOptions({ children }: { children: ReactNode }) {
  const t = useTranslations("unifiedWorkspace");
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if ((event.target as Element)?.closest?.('[data-agent-model-picker]')) return;
      if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute("open");
    };
    const escape = (event: KeyboardEvent) => {
      if (document.querySelector('[data-agent-model-picker][open]')) return;
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return <details ref={ref} className={styles.chatOptions}>
    <summary aria-label={t("chatOptions")} title={t("chatOptions")}><SlidersHorizontal size={17}/><ChevronDown size={13}/></summary>
    <div className={styles.chatOptionsContent}><h2>{t("chatOptions")}</h2>{children}</div>
  </details>;
}
