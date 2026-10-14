"use client";
import { ArrowUpRight, Bot, Menu, Plus } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Agent } from "@/lib/api";
import styles from "./StudioWorkspace.module.css";

export function AgentsHome({
  agents,
  guest,
  allowed,
  loading,
  error,
  onSelect,
  onCreate,
  onMenu,
  onPlans,
  onRetry,
}: {
  agents: Agent[];
  guest: boolean;
  allowed: boolean;
  loading: boolean;
  error: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onMenu: () => void;
  onPlans: () => void;
  onRetry: () => void;
}) {
  return (
    <section className={styles.studio} aria-label="Your agentic workspace">
      <header className={styles.header}>
        <button
          className={styles.mobile}
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className={styles.identity}>
          <Bot size={18} />
          <strong>Agents</strong>
          <span>Your tools. Your context. Your agents.</span>
        </div>
        <Link className={styles.balance} href="/dashboard">
          Full workspace ↗
        </Link>
      </header>
      <div className={styles.body}>
        <div className={styles.title}>
          <span>AGENTIC CHAT</span>
          <h1>A conversation that gets work done.</h1>
          <p>
            Chat with your OpenClaw, Hermes and IronClaw agents. Their tools,
            memory and workspace stay with them.
          </p>
        </div>
        <section className={styles.library}>
          <div className={styles.libraryHeading}>
            <div>
              <h2>Your agents</h2>
              <p>Choose an agent to continue, or hatch one for a new task.</p>
            </div>
            {allowed && (
              <button onClick={onCreate}>
                <Plus size={16} />
                Create agent
              </button>
            )}
          </div>
          {loading && <p role="status">Loading your agents…</p>}
          {error && (
            <p role="alert" className={styles.error}>
              {error} <button onClick={onRetry}>Retry</button>
            </p>
          )}
          {guest ? (
            <div className={styles.empty}>
              <Bot size={28} />
              <strong>Your agentic workspace starts here.</strong>
              <p>
                Sign in to create an agent, connect its tools and chat in one
                place.
              </p>
              <Link href="/login?return=%2F%3Fmode%3Dagents">
                Sign in to your agents ↗
              </Link>
            </div>
          ) : !allowed ? (
            <div className={styles.empty}>
              <Bot size={28} />
              <strong>Bring agents into your Hatcher workspace.</strong>
              <p>
                Choose a Hatcher plan with hosted agents, Web Chat and shared AI
                Credits. Existing Web Chat allowances stay available until their
                expiry.
              </p>
              <button onClick={onPlans}>Explore Hatcher plans ↗</button>
            </div>
          ) : (
            <div className={styles.assets}>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  className={styles.asset}
                  style={{ textAlign: "left" }}
                  onClick={() => onSelect(agent.id)}
                >
                  <div className={styles.assetDetails}>
                    <Bot size={24} />
                    <h3 style={{ fontWeight: 600, margin: "16px 0 8px" }}>
                      {agent.name}
                    </h3>
                    <span>
                      {agent.framework} · {agent.status}
                    </span>
                    <p>
                      {agent.description ||
                        "Open your agent conversation and simple settings."}
                    </p>
                    <span>
                      Open chat{" "}
                      <ArrowUpRight size={13} style={{ display: "inline" }} />
                    </span>
                  </div>
                </button>
              ))}
              <button className={styles.empty} onClick={onCreate}>
                <Plus size={25} />
                <strong>Hatch an agent</strong>
                <p>Pick a task, choose a framework and make it yours.</p>
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
