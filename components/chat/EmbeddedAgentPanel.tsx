"use client";

import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  MessageSquare,
  Play,
  Settings2,
  Square,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useAgentContext } from "@/components/agents/AgentContext";
import { AgentStatusPill } from "@/components/ui/AgentStatusPill";
import styles from "./ChatWorkspace.module.css";

const ChatTab = dynamic(() =>
  import("@/components/agents/tabs/ChatTab").then((m) => m.ChatTab),
);
const SimpleConfigTab = dynamic(() =>
  import("@/components/agents/tabs/SimpleConfigTab").then(
    (m) => m.SimpleConfigTab,
  ),
);

export function EmbeddedAgentPanel() {
  const {
    agent,
    tab,
    setTab,
    isActive,
    isNotActive,
    statusInfo,
    sending,
    queuedChatCount,
    actionLoading,
    actionError,
    handleAction,
  } = useAgentContext();
  const working = sending || queuedChatCount > 0 || Boolean(actionLoading);
  return (
    <div className={styles.agentWorkspace}>
      <div className={styles.agentToolbar}>
        <div className={styles.agentIdentity}>
          <strong>{agent.name}</strong>
          <span>
            {agent.framework === "openclaw"
              ? "OpenClaw"
              : agent.framework === "hermes"
                ? "Hermes"
                : "IronClaw"}
          </span>
        </div>
        <AgentStatusPill
          status={agent.status}
          label={statusInfo.label}
          pulse={statusInfo.pulse}
          size="md"
        />
        <div className={styles.agentActions}>
          {(isActive || isNotActive) && (
            <button
              disabled={working}
              onClick={() => void handleAction(isActive ? "stop" : "start")}
            >
              {isActive ? <Square size={14} /> : <Play size={14} />}
              {actionLoading
                ? "Updating…"
                : isActive
                  ? "Stop agent"
                  : "Start agent"}
            </button>
          )}
          <button
            disabled={working}
            aria-pressed={tab === "config"}
            onClick={() => setTab(tab === "config" ? "chat" : "config")}
          >
            {tab === "config" ? (
              <MessageSquare size={15} />
            ) : (
              <Settings2 size={15} />
            )}
            {tab === "config" ? "Back to agent chat" : "Agent settings"}
          </button>
          <Link
            href={`/dashboard/agent/${encodeURIComponent(agent.id)}?tab=${tab}&view=advanced`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Full workspace <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}
      {isNotActive && tab !== "config" && (
        <p className={styles.agentNotice}>
          Your agent is stopped. Start it here to chat. Model usage uses your AI
          Credits or configured provider.
        </p>
      )}
      <div
        className={tab === "config" ? styles.agentSettings : styles.agentChat}
      >
        {tab === "config" ? (
          <SimpleConfigTab key={agent.id} />
        ) : (
          <ChatTab compact />
        )}
      </div>
    </div>
  );
}
