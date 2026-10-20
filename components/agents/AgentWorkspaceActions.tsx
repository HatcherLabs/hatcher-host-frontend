"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Copy, MoreHorizontal, Play, RotateCcw, Share2, Square, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { WorkspacePortal } from "@/components/workspace/WorkspacePortal";
import styles from "@/components/workspace/WorkspaceShell.module.css";
import { useAgentContext } from "./AgentContext";

export function AgentWorkspaceActions({ children, onClone }: { children: ReactNode; onClone: () => void }) {
  const workspace = useWorkspace();
  const ctx = useAgentContext();
  const t = useTranslations("unifiedWorkspace");
  const h = useTranslations("dashboard.agentDetail.header");
  const status = useTranslations("shared.agentStatus");
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute("open"); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown",close); document.addEventListener("keydown",escape);
    return () => { document.removeEventListener("pointerdown",close); document.removeEventListener("keydown",escape); };
  }, []);
  if (!workspace) return <>{children}</>;
  const share = () => {
    const text = `Check out "${ctx.agent.name}" — ${ctx.agent.description || 'an AI agent'}. Built on Hatcher with ${ctx.agent.framework}.\n\nhatcher.host`;
    if (navigator.share) void navigator.share({ title: ctx.agent.name, text, url: 'https://hatcher.host' }).catch(() => {});
    else window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'width=550,height=420');
  };
  return <WorkspacePortal region="actions">
    <details ref={ref} className={styles.agentActionMenu}>
      <summary aria-label={t("agentActions")} title={t("agentActions")}><MoreHorizontal size={20}/></summary>
      <div className={styles.agentActionContent} data-agent-action-panel>
        <div className={styles.agentActionTitle}>
          <strong>{t("agentActions")}</strong>
          <span><i className={styles.statusDot} data-status={ctx.agent.status}/>{status.has(ctx.agent.status) ? status(ctx.agent.status) : ctx.agent.status}</span>
        </div>
        <div className={styles.agentActionList}>
          {ctx.isActive && <>
            <button type="button" className={styles.agentActionRow} disabled={!!ctx.actionLoading} onClick={() => void ctx.handleAction('restart')}>
              <RotateCcw size={16}/><span>{ctx.actionLoading === 'restart' ? h('restarting') : h('restart')}</span>
            </button>
            <button type="button" className={styles.agentActionRow} disabled={!!ctx.actionLoading} onClick={() => void ctx.handleAction('stop')}>
              <Square size={16}/><span>{ctx.actionLoading === 'stop' ? h('stopping') : h('stop')}</span>
            </button>
          </>}
          {ctx.isNotActive && <button type="button" className={styles.agentActionRow} disabled={!!ctx.actionLoading} onClick={() => void ctx.handleAction('start')}>
            <Play size={16}/><span>{ctx.actionLoading === 'start' ? h('starting') : h('start')}</span>
          </button>}
          <button type="button" className={styles.agentActionRow} onClick={share}><Share2 size={16}/><span>{h('share')}</span></button>
          {ctx.agent.framework !== 'ironclaw' && <button type="button" className={styles.agentActionRow} onClick={() => { ref.current?.removeAttribute('open'); onClone(); }}><Copy size={16}/><span>{h('clone')}</span></button>}
        </div>
        <div className={styles.agentActionModes} aria-label="View mode">
          <button type="button" aria-pressed={ctx.viewMode === 'easy'} onClick={() => ctx.setViewMode('easy')}>{h('easy')}</button>
          <button type="button" aria-pressed={ctx.viewMode === 'advanced'} onClick={() => ctx.setViewMode('advanced')}>{h('advanced')}</button>
        </div>
        <div className={styles.agentActionDanger}>
          <button type="button" className={styles.agentActionRow} disabled={ctx.deleting} onClick={() => void ctx.handleDelete()}>
            <Trash2 size={16}/><span>{ctx.deleting ? h('deleting') : ctx.deleteConfirm ? h('confirm') : h('delete')}</span>
          </button>
          {ctx.deleteConfirm && !ctx.deleting && <button type="button" className={styles.agentActionRow} onClick={() => { ctx.setDeleteConfirm(false); ctx.setDeleteError(null); }}>{h('cancel')}</button>}
        </div>
      </div>
    </details>
  </WorkspacePortal>;
}
