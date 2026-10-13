"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAgentContext } from "../AgentContext";

const inputClass =
  "w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-sm text-[var(--text-primary)]";

export function SimpleConfigTab() {
  const { agent, loadAgent, setViewMode, setTab, sending } = useAgentContext();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? "");
  const [instructions, setInstructions] = useState(
    typeof agent.config?.systemPrompt === "string"
      ? agent.config.systemPrompt
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const running = ["active", "sleeping", "starting", "restarting"].includes(
    agent.status,
  );
  const instructionsChanged =
    instructions !== (agent.config?.systemPrompt ?? "");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      // Patch only visible fields. Preserve model routing, integrations, credentials,
      // public-chat settings and framework-specific configuration verbatim.
      const result = await api.updateAgent(agent.id, {
        name: name.trim(),
        description: description.trim(),
        ...(instructionsChanged
          ? { config: { systemPrompt: instructions } }
          : {}),
      });
      if (!result.success) throw new Error(result.error);
      await loadAgent();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
        Agent settings
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        Give your agent a name and clear instructions. Manage tools and
        connections in its workspace.
      </p>
      <form onSubmit={save} className="mt-6 space-y-5">
        <fieldset disabled={saving} className="space-y-5">
          <label className="block space-y-2 text-sm">
            <span>Name</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              minLength={3}
              maxLength={50}
              required
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>Description</span>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              maxLength={140}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>Instructions</span>
            <textarea
              aria-label="Instructions"
              className={inputClass}
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                setSaved(false);
              }}
              maxLength={8000}
              rows={8}
            />
          </label>
          {running && instructionsChanged && (
            <p className="text-sm text-[var(--text-secondary)]">
              Stop the agent before changing its instructions, then start it
              again to apply them.
            </p>
          )}
          {sending && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              Wait for the current reply before saving.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              Settings saved.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <button
              disabled={sending || (running && instructionsChanged)}
              type="submit"
              className="rounded-lg bg-[var(--text-primary)] px-5 py-3 font-semibold text-[var(--bg-base)] disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            <button
              type="button"
              onClick={() =>
                setTab(
                  agent.framework === "ironclaw" ? "plugins" : "integrations",
                )
              }
            >
              Connections &amp; tools
            </button>
            <button type="button" onClick={() => setViewMode("advanced")}>
              Advanced settings
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
