"use client";

import { useTranslations } from "next-intl";
import { AppWindow, BarChart3, BookOpen, Brain, ChevronDown, FileText, Folder, LayoutDashboard, ListChecks, Mail, MessageSquare, Network, Plug, Settings, ShieldCheck, Terminal, Wallet, type LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { WorkspacePortal } from "@/components/workspace/WorkspacePortal";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import styles from "@/components/workspace/WorkspaceShell.module.css";
import { buildAgentNavigationTabs, agentDesktopHref, EASY_AGENT_TABS } from "./navigationModel";
import { useAgentContext, type Tab } from "./AgentContext";

const ICONS: Partial<Record<Tab, LucideIcon>> = { chat:MessageSquare, overview:LayoutDashboard, files:Folder, knowledge:BookOpen, integrations:Plug, config:Settings, logs:FileText, terminal:Terminal, wallet:Wallet, mail:Mail, stats:BarChart3, connectors:Network, schedules:ListChecks };
const PRIMARY: Tab[] = ["chat", "overview", "files", "knowledge", "integrations", "agentpit"];

export function AgentWorkspaceTabs() {
  const { agent, tab, setTab, viewMode, setViewMode, activeModelDisplay, openModelSettings } = useAgentContext();
  const searchParams = useSearchParams();
  const modelSettingsActive = tab === "config" && viewMode === "advanced" && searchParams.get("configTab") === "ai-models";
  const workspace = useWorkspace();
  const t = useTranslations("dashboard.agentDetail.tabs");
  const u = useTranslations("unifiedWorkspace");
  const w = useTranslations("workspace");
  const allTabs = buildAgentNavigationTabs(agent.framework, id => {
    if (id === "agentpit") return "AgentPit";
    if (id === "config") return w("settings");
    if (id === "overview") return u("overview");
    if (agent.framework === "ironclaw" && id === "plugins") return t("ironclawCapabilities");
    if (agent.framework === "ironclaw" && id === "schedules") return t("ironclawAutomations");
    return t(id);
  }, "advanced");
  const primary = PRIMARY.flatMap(id => allTabs.filter(item => item.id === id));
  const more = allTabs.filter(item => !PRIMARY.includes(item.id) && item.id !== "config");
  const renderTab = (item: typeof allTabs[number]) => {
    const Icon = ICONS[item.id] ?? Plug;
    return <button key={item.id} type="button" className={styles.row} aria-current={tab === item.id && !(item.id === "config" && modelSettingsActive) ? "page" : undefined} data-tour={`agent-tab-${item.id}`} onClick={() => {
      if (viewMode === "easy" && !EASY_AGENT_TABS.includes(item.id)) setViewMode("advanced");
      setTab(item.id);
      if (item.id === "config") {
        const url = new URL(window.location.href);
        url.searchParams.set("configTab", "general");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
      workspace?.closeSidebar();
    }}><Icon size={18} strokeWidth={1.7}/><span>{item.label}</span></button>;
  };
  return <>
    <WorkspacePortal region="header"><div className={styles.agentHeadline}><i className={styles.statusDot} data-status={agent.status}/><strong>{agent.name}</strong><span>/ {modelSettingsActive ? "Model & Provider" : allTabs.find(item => item.id === tab)?.label ?? t("chat")}</span></div></WorkspacePortal>
    <WorkspacePortal><nav className={styles.agentNavigation} aria-label={u("agentNavigation")} data-tour="agent-nav">
      {primary.map(renderTab)}
      <details className={styles.group} open={more.some(item => item.id === tab)}><summary>{u("advanced")}<ChevronDown size={15}/></summary>{more.map(renderTab)}<Link className={styles.row} href={agentDesktopHref(agent.id)} onClick={() => workspace?.closeSidebar()}><AppWindow size={18}/><span>{u("desktop")}</span></Link></details>
      <div className={styles.contextExtras}><Link className={styles.row} href={`/dashboard/missions?agent=${encodeURIComponent(agent.id)}`} onClick={() => workspace?.closeSidebar()}><ListChecks size={18}/><span>{w("missions")}</span></Link><Link className={styles.row} href={`/dashboard/approvals?agent=${encodeURIComponent(agent.id)}`} onClick={() => workspace?.closeSidebar()}><ShieldCheck size={18}/><span>{w("approvals")}</span></Link></div>
    </nav></WorkspacePortal>
    <WorkspacePortal region="settings">
      <button type="button" className={`${styles.row} ${styles.agentModelRow}`} aria-current={modelSettingsActive ? "page" : undefined}
        data-testid="agent-model-settings" onClick={() => { openModelSettings(); workspace?.closeSidebar(); }}>
        <Brain size={18} strokeWidth={1.7}/><span>Model &amp; Provider<small>{activeModelDisplay.name}<br/>{activeModelDisplay.provider}</small></span>
      </button>
      {allTabs.filter(item => item.id === "config").map(renderTab)}
    </WorkspacePortal>
  </>;
}
