"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Blocks,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { GlassCard, useAgentContext } from "../AgentContext";
import { IRONCLAW_OAUTH_EXTENSION_IDS } from "../ironclawExtensions";
import { isValidMcpServerUrl } from "./ironclawRuntime";

type SubTab = "extensions" | "skills" | "permissions";
type JsonRecord = Record<string, unknown>;

interface ExtensionItem {
  id: string;
  name: string;
  description: string;
  runtime: string;
  installed: boolean;
  surfaces: string[];
  connectionStrategy: string | null;
}

interface SkillItem {
  name: string;
  description: string;
  sourceKind: string;
  autoActivate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface ToolItem {
  id: string;
  name: string;
  description: string;
  state: "default" | "always_allow" | "ask_each_time" | "disabled";
  defaultState: string;
  locked: boolean;
}

interface ExtensionSecret {
  name: string;
  prompt: string;
  optional: boolean;
  provided: boolean;
  setupKind: string;
  invocationId?: string;
}

interface PairingPending {
  code: string;
  deep_link?: string;
  expires_at: string;
}

type SetupMode = "manual" | "oauth" | "pairing" | "none";

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function extensionId(value: unknown): string {
  const item = record(value);
  const packageRef = record(item.package_ref);
  return String(packageRef.id ?? item.id ?? item.package_id ?? "");
}

function surfaceLabels(value: unknown): string[] {
  const surfaces = record(value).surfaces;
  if (!Array.isArray(surfaces)) return [];
  return surfaces.flatMap((surface) => {
    if (typeof surface === "string") return [surface];
    const item = record(surface);
    const kind = item.kind ?? item.type ?? item.surface;
    return typeof kind === "string" ? [kind] : [];
  });
}

function extensionConnectionStrategy(value: unknown): string | null {
  const surfaces = record(value).surfaces;
  if (!Array.isArray(surfaces)) return null;
  for (const surface of surfaces) {
    const strategy = record(record(surface).connection).strategy;
    if (typeof strategy === "string" && strategy) return strategy;
  }
  return null;
}

function normalizeToolEntry(value: unknown): ToolItem | null {
  const entry = record(value);
  const key = String(entry.key ?? "");
  if (!key.startsWith("tool.")) return null;
  const config = record(entry.value);
  const id = String(config.name ?? key.slice(5));
  if (!id) return null;
  const rawState = String(
    config.state ?? config.default_state ?? "ask_each_time",
  );
  return {
    id,
    name: id.replace(/^builtin\./, "").replace(/[._-]+/g, " "),
    description: String(config.description ?? ""),
    state: (["always_allow", "ask_each_time", "disabled"].includes(rawState)
      ? rawState
      : "default") as ToolItem["state"],
    defaultState: String(config.default_state ?? "ask_each_time"),
    locked: Boolean(config.locked || entry.mutable === false),
  };
}

export function IronClawExtensionsTab() {
  const t = useTranslations("dashboard.agentDetail.ironclaw.extensions");
  const tMcp = useTranslations("dashboard.agentDetail.ironclaw.mcp");
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<SubTab>("extensions");
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [autoActivateLearned, setAutoActivateLearned] = useState(true);
  const [autoApproveTools, setAutoApproveTools] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState("");
  const [skillName, setSkillName] = useState("");
  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const [setupItem, setSetupItem] = useState<ExtensionItem | null>(null);
  const [setupSecrets, setSetupSecrets] = useState<ExtensionSecret[]>([]);
  const [setupValues, setSetupValues] = useState<Record<string, string>>({});
  const [setupInstructions, setSetupInstructions] = useState("");
  const [setupMode, setSetupMode] = useState<SetupMode>("none");
  const [pairingConnected, setPairingConnected] = useState(false);
  const [pairingPending, setPairingPending] = useState<PairingPending | null>(
    null,
  );
  const [pairingLoading, setPairingLoading] = useState(false);
  const [oauthFlow, setOauthFlow] = useState<{
    flowId: string;
    invocationId?: string;
    authorizationUrl: string;
  } | null>(null);
  const [oauthError, setOauthError] = useState("");
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpToken, setMcpToken] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [extensionsResponse, skillsResponse, toolsResponse] =
      await Promise.all([
        api.getIronClawExtensions(agent.id),
        api.getIronClawSkills(agent.id),
        api.getIronClawTools(agent.id),
      ]);

    if (extensionsResponse.success) {
      const installedItems = extensionsResponse.data.installed.extensions ?? [];
      const installedIds = new Set(
        installedItems.map(extensionId).filter(Boolean),
      );
      const registryItems = extensionsResponse.data.registry.entries ?? [];
      setExtensions(
        registryItems
          .map((raw) => {
            const item = record(raw);
            const id = extensionId(item);
            return {
              id,
              name: String(item.display_name ?? id),
              description: String(item.description ?? ""),
              runtime: String(item.runtime ?? "extension"),
              installed: Boolean(item.installed || installedIds.has(id)),
              surfaces: surfaceLabels(item),
              connectionStrategy:
                extensionConnectionStrategy(item) ??
                (IRONCLAW_OAUTH_EXTENSION_IDS.has(id) ? "oauth" : null),
            };
          })
          .filter((item) => item.id),
      );
    }
    if (skillsResponse.success) {
      setAutoActivateLearned(
        skillsResponse.data.auto_activate_learned !== false,
      );
      setSkills(
        (skillsResponse.data.skills ?? [])
          .map((raw) => {
            const item = record(raw);
            return {
              name: String(item.name ?? ""),
              description: String(item.description ?? ""),
              sourceKind: String(item.source_kind ?? "user"),
              autoActivate: item.auto_activate !== false,
              canEdit: Boolean(item.can_edit),
              canDelete: Boolean(item.can_delete),
            };
          })
          .filter((item) => item.name),
      );
    }
    if (toolsResponse.success) {
      const entries = toolsResponse.data.entries ?? [];
      const autoApprove = entries.find(
        (entry) => record(entry).key === "agent.auto_approve_tools",
      );
      setAutoApproveTools(
        autoApprove ? Boolean(record(autoApprove).value) : true,
      );
      setTools(
        entries
          .map(normalizeToolEntry)
          .filter((item): item is ToolItem => item !== null),
      );
    }
    const errors = [extensionsResponse, skillsResponse, toolsResponse]
      .filter((response) => !response.success)
      .map((response) => response.error);
    if (errors.length)
      toast.error(errors[0] ?? t("loadError"));
    setLoading(false);
  }, [agent.id, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredExtensions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return extensions;
    return extensions.filter((item) =>
      `${item.name} ${item.description} ${item.runtime}`
        .toLowerCase()
        .includes(query),
    );
  }, [extensions, search]);

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter((item) =>
      `${item.name} ${item.description} ${item.sourceKind}`
        .toLowerCase()
        .includes(query),
    );
  }, [search, skills]);

  const filteredTools = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tools;
    return tools.filter((item) =>
      `${item.name} ${item.description} ${item.id}`
        .toLowerCase()
        .includes(query),
    );
  }, [search, tools]);

  const run = async (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    success: string,
  ) => {
    setBusy(key);
    try {
      const response = await action();
      if (!response.success) {
        toast.error(response.error ?? t("actionFailed"));
        return;
      }
      toast.success(success);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const openSkill = async (skill: SkillItem) => {
    if (!skill.canEdit) return;
    if (expandedSkill === skill.name) {
      setExpandedSkill(null);
      return;
    }
    setBusy(`read-skill:${skill.name}`);
    const response = await api.getIronClawSkill(agent.id, skill.name);
    setBusy(null);
    if (!response.success) {
      toast.error(response.error ?? t("skillLoadError"));
      return;
    }
    setSkillContent(response.data.content);
    setExpandedSkill(skill.name);
  };

  const createSkill = async () => {
    const name = skillName.trim();
    const content = skillContent.trim();
    if (!name || !content) return;
    await run(
      `create-skill:${name}`,
      () => api.installIronClawSkill(agent.id, name, content),
      t("skillInstalled", { name }),
    );
    setSkillName("");
    setSkillContent("");
    setShowCreateSkill(false);
  };

  const registerMcpServer = async () => {
    const name = mcpName.trim();
    const url = mcpUrl.trim();
    const token = mcpToken.trim();
    if (!name || !isValidMcpServerUrl(url)) return;
    setBusy("mcp-register");
    const response = await api.registerIronClawMcpServer(agent.id, {
      name,
      url,
      ...(token ? { auth: { type: "bearer" as const, token } } : {}),
    });
    setBusy(null);
    if (!response.success) {
      toast.error(response.error ?? tMcp("registerFailed"));
      return;
    }
    toast.success(tMcp("registered", { name }));
    setMcpName("");
    setMcpUrl("");
    setMcpToken("");
    setShowMcpForm(false);
    await load();
  };

  const refreshPairing = useCallback(
    async (item: ExtensionItem, mintIfMissing: boolean) => {
      setPairingLoading(true);
      const status = await api.getIronClawExtensionPairingStatus(
        agent.id,
        item.id,
      );
      if (!status.success) {
        setPairingLoading(false);
        toast.error(status.error ?? t("pairingLoadError", { name: item.name }));
        return;
      }
      setPairingConnected(status.data.connected);
      setPairingPending(status.data.pending);
      if (!status.data.connected && !status.data.pending && mintIfMissing) {
        const minted = await api.mintIronClawExtensionPairingCode(
          agent.id,
          item.id,
        );
        if (minted.success) setPairingPending(minted.data);
        else
          toast.error(minted.error ?? t("pairingStartError", { name: item.name }));
      }
      setPairingLoading(false);
    },
    [agent.id, t, toast],
  );

  useEffect(() => {
    if (!setupItem || setupMode !== "pairing" || pairingConnected) return;
    const timer = window.setInterval(() => {
      void refreshPairing(setupItem, false);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [pairingConnected, refreshPairing, setupItem, setupMode]);

  useEffect(() => {
    if (!oauthFlow || !setupItem) return;
    let pending = false;
    const poll = async () => {
      if (pending) return;
      pending = true;
      const response = await api.reconcileIronClawOAuthFlow(
        agent.id,
        oauthFlow.flowId,
        oauthFlow.invocationId,
      );
      pending = false;
      if (!response.success) return;
      const status = response.data.status;
      if (status === "completed") {
        toast.success(t("oauthConnected", { name: setupItem.name }));
        setOauthFlow(null);
        setSetupItem(null);
        await load();
      } else if (["failed", "expired", "canceled"].includes(status)) {
        setOauthError(t("oauthStatusError", { status }));
        setOauthFlow(null);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => window.clearInterval(timer);
  }, [agent.id, load, oauthFlow, setupItem, t, toast]);

  const openExtensionSetup = async (item: ExtensionItem) => {
    setBusy(`extension-setup-read:${item.id}`);
    const response = await api.getIronClawExtensionSetup(agent.id, item.id);
    setBusy(null);
    if (!response.success) {
      toast.error(response.error ?? t("setupLoadError", { name: item.name }));
      return;
    }
    const payload = record(response.data);
    const secrets = Array.isArray(payload.secrets)
      ? payload.secrets
          .map((raw) => {
            const secret = record(raw);
            return {
              name: String(secret.name ?? ""),
              prompt: String(secret.prompt ?? secret.name ?? "Credential"),
              optional: Boolean(secret.optional),
              provided: Boolean(secret.provided),
              setupKind: String(record(secret.setup).kind ?? "manual_token"),
              invocationId:
                typeof record(secret.setup).invocation_id === "string"
                  ? String(record(secret.setup).invocation_id)
                  : undefined,
            };
          })
          .filter((secret) => secret.name)
      : [];
    const firstExtension = Array.isArray(record(payload.payload).extensions)
      ? record((record(payload.payload).extensions as unknown[])[0])
      : {};
    const summary = record(firstExtension.summary);
    const onboarding = record(summary.onboarding);
    const channelConnection = record(summary.channel_connection);
    const connectionStrategy = String(
      channelConnection.strategy ?? item.connectionStrategy ?? "",
    );
    const nextMode: SetupMode =
      connectionStrategy === "web_generated_code"
        ? "pairing"
        : secrets.some((secret) => secret.setupKind === "oauth")
          ? "oauth"
          : secrets.length > 0
            ? "manual"
            : "none";
    setSetupSecrets(secrets);
    setSetupValues({});
    setSetupInstructions(
      String(
        onboarding.credential_instructions ??
          onboarding.instructions ??
          t("setupInstructionsFallback"),
      ),
    );
    setSetupMode(nextMode);
    setPairingConnected(false);
    setPairingPending(null);
    setOauthFlow(null);
    setOauthError("");
    setSetupItem(item);
    if (nextMode === "pairing") void refreshPairing(item, true);
  };

  const startOauth = async (secret: ExtensionSecret) => {
    if (!setupItem) return;
    const key = `extension-oauth:${setupItem.id}:${secret.name}`;
    setBusy(key);
    setOauthError("");
    const response = await api.startIronClawExtensionOAuth(
      agent.id,
      setupItem.id,
      secret.name,
      secret.invocationId,
    );
    setBusy(null);
    if (!response.success) {
      setOauthError(response.error ?? t("oauthStartError", { name: setupItem.name }));
      return;
    }
    const invocationId =
      response.data.callback_scope?.invocation_id ?? secret.invocationId;
    setOauthFlow({
      flowId: response.data.flow_id,
      invocationId,
      authorizationUrl: response.data.authorization_url,
    });
    const popup = window.open(
      response.data.authorization_url,
      `ironclaw-oauth-${setupItem.id}`,
      "popup,width=640,height=760",
    );
    if (popup) popup.opener = null;
    if (!popup) {
      setOauthError(t("oauthPopupBlocked"));
    }
  };

  const submitExtensionSetup = async () => {
    if (!setupItem || setupMode !== "manual") return;
    const secrets = Object.fromEntries(
      setupSecrets.flatMap((secret) => {
        const value = setupValues[secret.name]?.trim();
        return value ? [[secret.name, value]] : [];
      }),
    );
    setBusy(`extension-setup-save:${setupItem.id}`);
    const response = await api.submitIronClawExtensionSetup(
      agent.id,
      setupItem.id,
      "submit",
      { secrets },
    );
    setBusy(null);
    if (!response.success) {
      toast.error(response.error ?? t("setupFailed", { name: setupItem.name }));
      return;
    }
    toast.success(t("setupSaved", { name: setupItem.name }));
    setSetupItem(null);
    setSetupValues({});
    await load();
  };

  const renewPairing = async () => {
    if (!setupItem) return;
    setPairingLoading(true);
    const response = await api.mintIronClawExtensionPairingCode(
      agent.id,
      setupItem.id,
    );
    if (response.success) {
      setPairingConnected(false);
      setPairingPending(response.data);
    } else {
      toast.error(
        response.error ?? t("pairingRenewError", { name: setupItem.name }),
      );
    }
    setPairingLoading(false);
  };

  const unpair = async () => {
    if (!setupItem) return;
    setPairingLoading(true);
    const response = await api.unpairIronClawExtension(agent.id, setupItem.id);
    if (response.success) {
      setPairingConnected(false);
      setPairingPending(null);
      await refreshPairing(setupItem, true);
    } else {
      toast.error(response.error ?? t("pairingDisconnectError", { name: setupItem.name }));
      setPairingLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Blocks size={17} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("title")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{" "}
          {t("refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-default)] pb-3">
        {(
          [
            ["extensions", t("subTabExtensions"), Blocks],
            ["skills", t("subTabSkills"), Sparkles],
            ["permissions", t("subTabPermissions"), ShieldCheck],
          ] as Array<[SubTab, string, typeof Blocks]>
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${subTab === id ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      <label className="relative block">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder", { section: subTab })}
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
        />
      </label>

      {setupItem && (
        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("configureTitle", { name: setupItem.name })}
                </h3>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">
                  {setupInstructions}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSetupItem(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {t("close")}
              </button>
            </div>
            {setupMode === "pairing" ? (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
                {pairingConnected ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                      <Check size={13} /> {t("pairingConnected", { name: setupItem.name })}
                    </span>
                    <button
                      type="button"
                      onClick={() => void unpair()}
                      disabled={pairingLoading}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                    >
                      {t("disconnect")}
                    </button>
                  </div>
                ) : pairingPending ? (
                  <div className="space-y-3">
                    <p className="text-xs leading-5 text-emerald-100/80">
                      {t("pairingHint")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg border border-emerald-500/25 bg-black/20 px-3 py-2 text-sm font-semibold tracking-wider text-emerald-200">
                        {pairingPending.code}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            pairingPending.code,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                      >
                        <Copy size={12} /> {t("copyCode")}
                      </button>
                      {pairingPending.deep_link && (
                        <a
                          href={pairingPending.deep_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300"
                        >
                          {t("openPairing")} <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                      <span>
                        {t("pairingExpires", {
                          date: new Date(pairingPending.expires_at).toLocaleString(),
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => void renewPairing()}
                        disabled={pairingLoading}
                        className="text-emerald-300 disabled:opacity-50"
                      >
                        {t("renewCode")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-200">
                    <Loader2 size={13} className="animate-spin" /> {t("preparingPairing")}
                  </div>
                )}
              </div>
            ) : setupMode === "oauth" ? (
              <div className="space-y-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
                <p className="text-xs leading-5 text-emerald-100/80">
                  {t("oauthHint")}
                </p>
                {setupSecrets
                  .filter((secret) => secret.setupKind === "oauth")
                  .map((secret) => {
                    const key = `extension-oauth:${setupItem.id}:${secret.name}`;
                    return (
                      <div
                        key={secret.name}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="text-xs text-[var(--text-secondary)]">
                          {secret.prompt}
                        </span>
                        <button
                          type="button"
                          onClick={() => void startOauth(secret)}
                          disabled={busy === key || Boolean(oauthFlow)}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                        >
                          {busy === key || oauthFlow ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                          {oauthFlow ? t("oauthWaiting") : t("connect")}
                        </button>
                      </div>
                    );
                  })}
                {oauthFlow && (
                  <a
                    href={oauthFlow.authorizationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-300"
                  >
                    {t("openAuthorization")} <ExternalLink size={12} />
                  </a>
                )}
                {oauthError && (
                  <p className="text-xs text-amber-200">{oauthError}</p>
                )}
              </div>
            ) : setupMode === "none" ? (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {t("noCredentialFields")}
              </p>
            ) : (
              <div className="space-y-3">
                {setupSecrets.map((secret) => (
                  <label key={secret.name} className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                      {secret.prompt}
                      {secret.optional && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {t("optionalBadge")}
                        </span>
                      )}
                      {secret.provided && (
                        <span className="text-[10px] text-emerald-400">
                          {t("alreadyConfigured")}
                        </span>
                      )}
                    </span>
                    <input
                      type="password"
                      autoComplete="off"
                      value={setupValues[secret.name] ?? ""}
                      onChange={(event) =>
                        setSetupValues((current) => ({
                          ...current,
                          [secret.name]: event.target.value,
                        }))
                      }
                      placeholder={
                        secret.provided
                          ? t("keepCurrentPlaceholder")
                          : t("enterCredential", { kind: secret.setupKind.replaceAll("_", " ") })
                      }
                      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                  </label>
                ))}
              </div>
            )}
            {setupMode === "manual" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void submitExtensionSetup()}
                  disabled={
                    busy === `extension-setup-save:${setupItem.id}` ||
                    setupSecrets.some(
                      (secret) =>
                        !secret.optional &&
                        !secret.provided &&
                        !setupValues[secret.name]?.trim(),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                >
                  {busy === `extension-setup-save:${setupItem.id}` && (
                    <Loader2 size={12} className="animate-spin" />
                  )}{" "}
                  {t("saveSecurely")}
                </button>
                <span className="self-center text-[10px] text-[var(--text-muted)]">
                  {t("credentialsNote")}
                </span>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" /> {t("loading")}
          </div>
        </GlassCard>
      ) : subTab === "extensions" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowMcpForm((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
          >
            <Plus size={13} /> {tMcp("addServer")}
          </button>
          {showMcpForm && (
            <GlassCard>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {tMcp("title")}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {tMcp("body")}
                  </p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    {tMcp("nameLabel")}
                  </span>
                  <input
                    value={mcpName}
                    onChange={(event) => setMcpName(event.target.value)}
                    placeholder={tMcp("namePlaceholder")}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    {tMcp("urlLabel")}
                  </span>
                  <input
                    value={mcpUrl}
                    onChange={(event) => setMcpUrl(event.target.value)}
                    placeholder={tMcp("urlPlaceholder")}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                  {mcpUrl.trim() !== "" && !isValidMcpServerUrl(mcpUrl) && (
                    <span className="mt-1 block text-xs text-amber-300">
                      {tMcp("httpsRequired")}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    {tMcp("tokenLabel")}
                  </span>
                  <input
                    type="password"
                    autoComplete="off"
                    value={mcpToken}
                    onChange={(event) => setMcpToken(event.target.value)}
                    placeholder={tMcp("tokenPlaceholder")}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void registerMcpServer()}
                    disabled={
                      busy === "mcp-register" ||
                      !mcpName.trim() ||
                      !isValidMcpServerUrl(mcpUrl)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                  >
                    {busy === "mcp-register" && (
                      <Loader2 size={12} className="animate-spin" />
                    )}{" "}
                    {tMcp("register")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMcpForm(false)}
                    disabled={busy === "mcp-register"}
                    className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                  >
                    {tMcp("cancel")}
                  </button>
                </div>
              </div>
            </GlassCard>
          )}
          <div className="grid gap-3 md:grid-cols-2">
          {filteredExtensions.map((item) => (
            <GlassCard key={item.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.name}
                    </h3>
                    <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase text-emerald-300">
                      {item.runtime}
                    </span>
                    {item.connectionStrategy === "oauth" && (
                      <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase text-amber-300">
                        {t("oauthCallbackRequired")}
                      </span>
                    )}
                    {item.connectionStrategy === "web_generated_code" && (
                      <span className="rounded border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-[10px] uppercase text-sky-300">
                        {t("nativePairing")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    {item.description}
                  </p>
                </div>
                {item.installed && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <Check size={12} /> {t("installedBadge")}
                  </span>
                )}
              </div>
              {item.surfaces.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.surfaces.map((surface) => (
                    <span
                      key={surface}
                      className="rounded-md bg-[var(--bg-card)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
                    >
                      {surface}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {item.installed && (
                  <button
                    type="button"
                    disabled={busy === `extension-setup-read:${item.id}`}
                    onClick={() => void openExtensionSetup(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-emerald-500/30"
                  >
                    {busy === `extension-setup-read:${item.id}` && (
                      <Loader2 size={12} className="animate-spin" />
                    )}{" "}
                    {t("configure")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === `extension:${item.id}`}
                  onClick={() =>
                    void run(
                      `extension:${item.id}`,
                      () =>
                        item.installed
                          ? api.removeIronClawExtension(agent.id, item.id)
                          : api.installIronClawExtension(agent.id, item.id),
                      item.installed
                        ? t("extensionRemoved", { name: item.name })
                        : t("extensionInstalled", { name: item.name }),
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${item.installed ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}`}
                >
                  {busy === `extension:${item.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : item.installed ? (
                    <Trash2 size={12} />
                  ) : (
                    <Plus size={12} />
                  )}
                  {item.installed ? t("remove") : t("install")}
                </button>
              </div>
            </GlassCard>
          ))}
          </div>
        </div>
      ) : subTab === "skills" ? (
        <div className="space-y-3">
          <GlassCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("autoActivateTitle")}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t("autoActivateBody")}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === "auto-activate"}
                onClick={() =>
                  void run(
                    "auto-activate",
                    () =>
                      api.setIronClawAutoActivateLearned(
                        agent.id,
                        !autoActivateLearned,
                      ),
                    autoActivateLearned
                      ? t("autoActivateDisabledToast")
                      : t("autoActivateEnabledToast"),
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs ${autoActivateLearned ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
              >
                {autoActivateLearned ? t("on") : t("off")}
              </button>
            </div>
          </GlassCard>
          <button
            type="button"
            onClick={() => {
              setShowCreateSkill((value) => !value);
              setExpandedSkill(null);
              setSkillContent("");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
          >
            <Plus size={13} /> {t("addCustomSkill")}
          </button>
          {showCreateSkill && (
            <GlassCard>
              <div className="space-y-3">
                <input
                  value={skillName}
                  onChange={(event) => setSkillName(event.target.value)}
                  placeholder={t("skillNamePlaceholder")}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm"
                />
                <textarea
                  value={skillContent}
                  onChange={(event) => setSkillContent(event.target.value)}
                  rows={10}
                  placeholder={t("skillContentPlaceholder")}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => void createSkill()}
                  disabled={
                    !skillName.trim() ||
                    !skillContent.trim() ||
                    busy?.startsWith("create-skill:")
                  }
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                >
                  {t("installSkill")}
                </button>
              </div>
            </GlassCard>
          )}
          {filteredSkills.map((skill) => (
            <GlassCard key={skill.name} className="!p-0 overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => void openSkill(skill)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  disabled={!skill.canEdit}
                >
                  {skill.canEdit ? (
                    expandedSkill === skill.name ? (
                      <ChevronDown
                        size={14}
                        className="mt-0.5 text-emerald-400"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="mt-0.5 text-[var(--text-muted)]"
                      />
                    )
                  ) : (
                    <Sparkles size={14} className="mt-0.5 text-emerald-400" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {skill.name}
                      </span>
                      <span className="text-[10px] uppercase text-[var(--text-muted)]">
                        {skill.sourceKind}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                      {skill.description}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void run(
                      `skill-toggle:${skill.name}`,
                      () =>
                        api.setIronClawSkillAutoActivate(
                          agent.id,
                          skill.name,
                          !skill.autoActivate,
                        ),
                      t("skillUpdated", { name: skill.name }),
                    );
                  }}
                  className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${skill.autoActivate ? "border-emerald-500/30 text-emerald-300" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
                >
                  {skill.autoActivate ? t("auto") : t("manual")}
                </button>
              </div>
              {expandedSkill === skill.name && (
                <div className="border-t border-[var(--border-default)] p-4">
                  <textarea
                    value={skillContent}
                    onChange={(event) => setSkillContent(event.target.value)}
                    rows={14}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 font-mono text-xs"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void run(
                          `skill-save:${skill.name}`,
                          () =>
                            api.updateIronClawSkill(
                              agent.id,
                              skill.name,
                              skillContent,
                            ),
                          t("skillSaved", { name: skill.name }),
                        )
                      }
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black"
                    >
                      {t("save")}
                    </button>
                    {skill.canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t("deleteSkillConfirm", { name: skill.name })))
                            void run(
                              `skill-delete:${skill.name}`,
                              () =>
                                api.removeIronClawSkill(agent.id, skill.name),
                              t("skillDeleted", { name: skill.name }),
                            );
                        }}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300"
                      >
                        {t("delete")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <GlassCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Wrench size={14} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {t("autoApproveTitle")}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t("autoApproveBody")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void run(
                    "tools-auto-approve",
                    () =>
                      api.setIronClawToolsAutoApprove(
                        agent.id,
                        !autoApproveTools,
                      ),
                    autoApproveTools
                      ? t("autoApproveDisabledToast")
                      : t("autoApproveEnabledToast"),
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs ${autoApproveTools ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-[var(--border-default)] text-[var(--text-muted)]"}`}
              >
                {autoApproveTools ? t("enabled") : t("disabled")}
              </button>
            </div>
          </GlassCard>
          {filteredTools.map((tool) => (
            <GlassCard key={tool.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium capitalize text-[var(--text-primary)]">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {tool.description || tool.id}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {t("toolDefault", { state: tool.defaultState.replaceAll("_", " ") })}
                  </p>
                </div>
                <select
                  value={tool.state}
                  disabled={tool.locked || busy === `tool:${tool.id}`}
                  onChange={(event) =>
                    void run(
                      `tool:${tool.id}`,
                      () =>
                        api.setIronClawToolPermission(
                          agent.id,
                          tool.id,
                          event.target.value,
                        ),
                      t("toolPermissionUpdated", { name: tool.name }),
                    )
                  }
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="default">{t("toolUseDefault")}</option>
                  <option value="always_allow">{t("toolAlwaysAllow")}</option>
                  <option value="ask_each_time">{t("toolAskEachTime")}</option>
                  <option value="disabled">{t("toolDisabled")}</option>
                </select>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
