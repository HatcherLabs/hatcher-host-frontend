"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { WorkspacePortal } from "@/components/workspace/WorkspacePortal";
import styles from "@/components/workspace/WorkspaceShell.module.css";

export function AgentWorkspaceActions({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const t = useTranslations("unifiedWorkspace");
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute("open"); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown",close); document.addEventListener("keydown",escape);
    return () => { document.removeEventListener("pointerdown",close); document.removeEventListener("keydown",escape); };
  }, []);
  if (!workspace) return <>{children}</>;
  return <WorkspacePortal region="actions"><details ref={ref} className={styles.agentActionMenu}><summary aria-label={t("agentActions")} title={t("agentActions")}><MoreHorizontal size={20}/></summary><div className={styles.agentActionContent}>{children}</div></details></WorkspacePortal>;
}
