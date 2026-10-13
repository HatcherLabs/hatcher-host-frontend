"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import { api, type Agent } from "@/lib/api";
import {
  AGENT_RUNTIMES,
  AGENT_STARTERS,
  buildQuickAgent,
  type AgentRuntime,
} from "@/lib/agent-starters";
import {
  DEFAULT_HOSTED_MODEL,
  HOSTED_MODELS,
} from "@/lib/hosted-model-catalog";
import styles from "./AgentHome.module.css";
export function QuickAgentCreate({
  onCreated,
  onClose,
}: {
  onCreated: (agent: Agent) => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [starter, setStarter] = useState<string>(AGENT_STARTERS[0].id);
  const [name, setName] = useState<string>(AGENT_STARTERS[0].name);
  const [instructions, setInstructions] = useState<string>(
    AGENT_STARTERS[0].instructions,
  );
  const [framework, setFramework] = useState<AgentRuntime>("openclaw");
  const [model, setModel] = useState(DEFAULT_HOSTED_MODEL);
  const saving = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setCreating(true);
    setCreateError("");
    try {
      const body = buildQuickAgent({
        name,
        instructions,
        framework,
        starter,
        model,
      });
      const result = await api.createAgent(body);
      if (!result.success) throw new Error(result.error);
      onCreated(result.data);
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Your agent could not be created.",
      );
    } finally {
      saving.current = false;
      setCreating(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.createDialog}
      aria-labelledby="create-agent-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving.current) onClose();
      }}
    >
      <section className={styles.create} aria-labelledby="create-agent-heading">
        <h2 id="create-agent-heading">Create your agent</h2>
        <p>
          A starting task, a runtime, and you are ready to set up your
          workspace.
        </p>
        <form onSubmit={create}>
          <fieldset disabled={creating} className={styles.fields}>
            <legend className={styles.legend}>Start with a task</legend>
            <div className={styles.starters}>
              {AGENT_STARTERS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={starter === item.id}
                  onClick={() => {
                    setStarter(item.id);
                    setName(item.name);
                    setInstructions(item.instructions);
                  }}
                >
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
            <div className={styles.twoColumns}>
              <label>
                Name
                <input
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={3}
                  maxLength={50}
                  required
                />
              </label>
              <label>
                Agent runtime
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as AgentRuntime)}
                >
                  {AGENT_RUNTIMES.map((runtime) => (
                    <option key={runtime} value={runtime}>
                      {runtime === "openclaw"
                        ? "OpenClaw"
                        : runtime === "hermes"
                          ? "Hermes"
                          : "IronClaw"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              What should your agent do?
              <textarea
                aria-label="What should your agent do?"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={8000}
                rows={5}
                required
              />
            </label>
            <details>
              <summary>Model &amp; setup</summary>
              <label>
                AI model
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {HOSTED_MODELS.filter(
                    (m) => m.providerKey !== "virtuals",
                  ).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Connect GitHub, MCP tools, or wallets from your agent workspace.
                Availability depends on the runtime. Connections require your
                authorization.
              </p>
            </details>
            <p className={styles.hint}>
              Your agent is created stopped. Review its setup, then start it
              from chat. Agent capacity follows your Hatcher plan; model usage
              uses AI Credits or your configured provider.
            </p>
            {createError && (
              <p role="alert" className={styles.error}>
                {createError}
              </p>
            )}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary}>
                {creating ? "Creating agent…" : "Create agent & open chat"}
              </button>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <Link href="/pricing">Agent plans</Link>
            </div>
          </fieldset>
        </form>
      </section>
    </dialog>
  );
}
