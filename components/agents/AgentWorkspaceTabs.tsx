"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { buildAgentNavigationTabs } from "./navigationModel";
import { useAgentContext, type Tab } from "./AgentContext";

export function AgentWorkspaceTabs() {
  const { agent, tab, setTab, viewMode } = useAgentContext();
  const t = useTranslations("dashboard.agentDetail.tabs");
  const nav = useRef<HTMLElement>(null);
  const allTabs = buildAgentNavigationTabs(
    agent.framework,
    (id) => {
      if (agent.framework === "ironclaw" && id === "plugins")
        return t("ironclawCapabilities");
      if (agent.framework === "ironclaw" && id === "schedules")
        return t("ironclawAutomations");
      return t(id === "overview" ? "dashboard" : id);
    },
    viewMode,
  );
  const primary = ["overview", "chat", "files", "logs", "config"];
  const tabs = primary.flatMap((id) =>
    allTabs.filter((item) => item.id === id),
  );
  const moreTabs = allTabs.filter((item) => !primary.includes(item.id));
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  function onKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id as Tab);
    nav.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <div className="min-w-0 shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-base)] px-4 sm:px-6">
      <div className="flex items-baseline gap-3 pb-1 pt-5">
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {agent.name}
        </h1>
        <span className="text-xs capitalize text-[var(--text-muted)]">
          {agent.framework}
        </span>
      </div>
      <nav
        ref={nav}
        role="tablist"
        aria-label="Agent navigation"
        data-tour="agent-nav"
        className="flex gap-6 overflow-x-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {tabs.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            data-tour={`agent-tab-${item.id}`}
            onKeyDown={(event) => onKey(event, index)}
            onClick={() => setTab(item.id)}
            className={`shrink-0 border-b-2 py-3 text-xs transition-colors ${tab === item.id ? "border-[var(--accent)] font-semibold text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            {item.label}
          </button>
        ))}
        {moreTabs.length > 0 && (
          <select
            aria-label="More agent tools"
            value={moreTabs.some((item) => item.id === tab) ? tab : ""}
            onChange={(event) => setTab(event.target.value as Tab)}
            className="my-2 max-w-[180px] shrink-0 rounded-md border-0 bg-[var(--bg-base)] px-2 text-xs text-[var(--text-secondary)]"
          >
            <option value="" disabled>
              More
            </option>
            {moreTabs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        )}
      </nav>
    </div>
  );
}
