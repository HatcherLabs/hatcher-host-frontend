"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { api, type Agent } from "@/lib/api";
import { loginHrefForReturn } from "@/lib/safe-redirect";
import NextImage from "next/image";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  ArrowUp,
  CalendarDays,
  Bot,
  Coins,
  CreditCard,
  Globe,
  ArrowUpRight,
  PenLine,
  Search,
  BarChart3,
  Check,
  Copy,
  Image,
  LogOut,
  Menu,
  Sun,
  Music2,
  Plus,
  Square,
  Trash2,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import {
  chatRequest as paidRequest,
  guestChatRequest,
  sendChat as sendRequest,
  DEFAULT_CHAT_MODEL,
  type ChatAccount,
  type ChatCreateKind,
  type ChatCreateTool,
  type ChatModel,
  type ChatTurn,
  type Conversation,
} from "@/lib/direct-chat";
import { RichMarkdown } from "@/components/agents/tabs/ChatTab/ArtifactRenderer";
import { HatcherMark } from "@/components/brand/HatcherMark";
import styles from "./ChatWorkspace.module.css";

const AgentWorkspace = dynamic(
  () => import("@/components/agents/AgentWorkspace"),
  {
    loading: () => (
      <p role="status" className="p-6">
        Opening agent chat…
      </p>
    ),
  },
);
const QuickAgentCreate = dynamic(() =>
  import("./QuickAgentCreate").then((m) => m.QuickAgentCreate),
);

export default function ChatWorkspace({
  guest = false,
  agentsEnabled = false,
}: {
  guest?: boolean;
  agentsEnabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const agentId = agentsEnabled && !guest ? searchParams.get("agent") : null;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState("");
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const agentsRequest = useRef(0);
  const invalidateAgents = useCallback(() => {
    ++agentsRequest.current;
  }, []);
  const agentList = useRef<HTMLElement>(null);
  const loadAgents = useCallback(async () => {
    if (guest || !agentsEnabled) return;
    const sequence = ++agentsRequest.current;
    setAgentsLoading(true);
    setAgentsError("");
    try {
      const result = await api.getMyAgents();
      if (sequence !== agentsRequest.current) return;
      if (!result.success) throw new Error(result.error);
      setAgents(result.data);
    } catch (error) {
      if (sequence === agentsRequest.current)
        setAgentsError(
          error instanceof Error ? error.message : "Could not load agents.",
        );
    } finally {
      if (sequence === agentsRequest.current) setAgentsLoading(false);
    }
  }, [guest, agentsEnabled]);
  useEffect(() => {
    void loadAgents();
    const reload = () => void loadAgents();
    window.addEventListener("focus", reload);
    const timer = window.setInterval(reload, 60000);
    return () => {
      invalidateAgents();
      window.removeEventListener("focus", reload);
      window.clearInterval(timer);
    };
  }, [loadAgents, invalidateAgents]);
  const updateAgent = useCallback((agent: Agent) => {
    setAgents((current) =>
      current.some((item) => item.id === agent.id)
        ? current.map((item) => (item.id === agent.id ? agent : item))
        : [...current, agent],
    );
  }, []);
  const selectAgent = (id: string | null) => {
    if (busy || agentBusy) return;
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("agent", id);
      url.searchParams.set("tab", "chat");
    } else {
      url.searchParams.delete("agent");
      url.searchParams.delete("tab");
    }
    url.searchParams.delete("agents");
    url.searchParams.delete("view");
    window.history.pushState(null, "", url.pathname + url.search);
    setSidebar(false);
  };
  const exploreAgents = () => {
    setSidebar(true);
    requestAnimationFrame(() => agentList.current?.focus());
  };
  useEffect(() => {
    if (
      searchParams.get("agents") === "1" ||
      (guest && searchParams.has("agent"))
    )
      setSidebar(true);
  }, [searchParams, guest]);
  const chatRequest = guest ? guestChatRequest : paidRequest;
  const sendChat = (
    id: string,
    prompt: string,
    model: string,
    signal: AbortSignal,
    delta: (text: string) => void,
  ) => sendRequest(id, prompt, model, signal, delta, undefined, guest);
  const rememberDraft = () => {
    try {
      sessionStorage.setItem("hatcher-chat-draft", prompt);
    } catch {}
  };
  const locale = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [account, setAccount] = useState<ChatAccount | null>(null);
  const [models, setModels] = useState<ChatModel[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const [chats, setChats] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const plansDialog = useRef<HTMLDialogElement>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [buying, setBuying] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [copied, setCopied] = useState("");
  const [createMode, setCreateMode] = useState<ChatCreateKind | "chart" | null>(
    null,
  );
  const [createMenu, setCreateMenu] = useState(false);
  const [createTools, setCreateTools] = useState<ChatCreateTool[]>([]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("plans") === "1")
      setShowPlans(true);
  }, []);
  useEffect(() => {
    if (showPlans) plansDialog.current?.showModal();
  }, [showPlans]);
  const closePlans = () => {
    plansDialog.current?.close();
    setShowPlans(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("plans")) {
      url.searchParams.delete("plans");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
  };
  const controller = useRef<AbortController | null>(null);
  const polling = useRef(new Set<string>());
  const selection = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    const [a, c] = await Promise.all([
      chatRequest<ChatAccount>("/account"),
      chatRequest<{ conversations: Conversation[] }>("/conversations"),
    ]);
    setAccount(a);
    setChats(c.conversations);
  }, [chatRequest]);
  useEffect(() => {
    let disposed = false;
    Promise.all([
      chatRequest<ChatAccount>("/account"),
      Promise.resolve({ conversations: [] as Conversation[] }),
      chatRequest<{ models: ChatModel[] }>("/models"),
      chatRequest<{ tools: ChatCreateTool[] }>("/create/config"),
    ])
      .then(([a, c, m, tools]) => {
        if (!disposed) {
          setAccount(a);
          setChats(c.conversations);
          setModels(m.models);
          setModel(
            m.models.find((item) => item.id === DEFAULT_CHAT_MODEL)?.id ??
              m.models[0]?.id ??
              "",
          );
          setCreateTools(tools.tools);
          void refresh().catch((e) => setError(e.message));
        }
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      controller.current?.abort();
    };
  }, [chatRequest, refresh]);
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem("hatcher-chat-draft");
      if (draft) {
        setPrompt(draft);
        sessionStorage.removeItem("hatcher-chat-draft");
      }
    } catch {}
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns]);
  useEffect(() => {
    const onFocus = () => {
      if (!controller.current) refresh().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refresh, chatRequest]);
  const modelNames = useMemo(
    () =>
      new Map([
        ...models.map((item) => [item.id, item.name] as const),
        ["market/coingecko", "CoinGecko"],
        ["market/dexscreener", "DexScreener"],
        ["media/seedream_image", "Seedream"],
        ["media/seedance_video", "Seedance"],
        ["media/suno_audio", "Suno"],
      ]),
    [models],
  );
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const open = async (id: string, preserveError = false) => {
    const epoch = ++selection.current;
    if (!preserveError) setError("");
    setSidebar(false);
    try {
      const chat = await chatRequest<Conversation & { turns: ChatTurn[] }>(
        `/conversations/${id}`,
      );
      if (epoch === selection.current) {
        setSelected(id);
        setModel(chat.model);
        setTurns(chat.turns);
      }
      return chat;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  };
  const pollGeneration = useCallback(
    async (turnId: string, kind: ChatCreateKind) => {
      if (polling.current.has(turnId)) return;
      polling.current.add(turnId);
      try {
        for (let attempt = 0; attempt < 45; attempt += 1) {
          if (attempt)
            await new Promise((resolve) => window.setTimeout(resolve, 4000));
          const result = await chatRequest<{ turn: ChatTurn; done: boolean }>(
            "/create/status",
            {
              method: "POST",
              body: JSON.stringify({ turnId, kind }),
            },
          );
          setTurns((previous) =>
            previous.map((turn) => (turn.id === turnId ? result.turn : turn)),
          );
          if (result.done) {
            await refresh();
            return;
          }
        }
        setError(
          "Generation is taking longer than expected. It will remain in this conversation; reopen it to check again.",
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        polling.current.delete(turnId);
      }
    },
    [refresh, chatRequest],
  );
  useEffect(() => {
    for (const turn of turns) {
      if (turn.status !== "generating" || !turn.generationId) continue;
      const kind = turn.model.includes("seedream")
        ? "image"
        : turn.model.includes("seedance")
          ? "video"
          : turn.model.includes("suno")
            ? "audio"
            : null;
      if (kind) void pollGeneration(turn.id, kind);
    }
  }, [turns, pollGeneration]);
  const createMedia = async (kind: ChatCreateKind, text: string) => {
    setBusy(true);
    setError("");
    setPrompt("");
    let id = selected;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        id = chat.id;
        setSelected(id);
      }
      const result = await chatRequest<{ turn: ChatTurn; done: boolean }>(
        "/create",
        {
          method: "POST",
          body: JSON.stringify({
            conversationId: id,
            kind,
            prompt: text.trim(),
          }),
        },
      );
      setTurns((previous) => [...previous, result.turn]);
      setCreateMode(null);
      await refresh();
      if (!result.done) void pollGeneration(result.turn.id, kind);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const createMarketChart = async (text: string) => {
    setBusy(true);
    setError("");
    setPrompt("");
    let id = selected;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        id = chat.id;
        setSelected(id);
      }
      const result = await chatRequest<{ turn: ChatTurn }>("/chart", {
        method: "POST",
        body: JSON.stringify({ conversationId: id, prompt: text.trim() }),
      });
      setTurns((previous) => [...previous, result.turn]);
      setCreateMode(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async (text = prompt) => {
    if (busy || !text.trim() || !model) return;
    if (createMode && createMode !== "chart")
      return void createMedia(createMode, text);
    if (createMode === "chart") return void createMarketChart(text);
    setBusy(true);
    setError("");
    setPrompt("");
    const abort = new AbortController();
    controller.current = abort;
    let id = selected;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        id = chat.id;
        setSelected(id);
      }
      const turn: ChatTurn = {
        id: "sending",
        prompt: text.trim(),
        response: "",
        model,
        status: "running",
        creditsCharged: null,
      };
      setTurns((previous) => [...previous, turn]);
      await sendChat(id, text.trim(), model, abort.signal, (delta) =>
        setTurns((previous) =>
          previous.map((t) =>
            t.id === "sending" ? { ...t, response: t.response + delta } : t,
          ),
        ),
      );
      setCreateMode(null);
    } catch (e) {
      if (!abort.signal.aborted) {
        setError((e as Error).message);
        setPrompt(text);
      }
    } finally {
      controller.current = null;
      await refresh().catch(() => undefined);
      if (id) {
        for (const delay of [0, 250, 750, 1500]) {
          if (delay)
            await new Promise((resolve) => window.setTimeout(resolve, delay));
          const chat = await open(id, true);
          if (!chat?.turns.some((turn) => turn.status === "running")) break;
        }
      }
      setBusy(false);
    }
  };
  const buy = async (planId: string) => {
    setBuying(true);
    setCheckoutError("");
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const result = await chatRequest<{ url: string }>("/checkout", {
        method: "POST",
        body: JSON.stringify({ planId, returnUrl }),
      });
      window.location.assign(result.url);
    } catch (e) {
      setCheckoutError((e as Error).message);
      setBuying(false);
    }
  };
  const budget = account?.budget;
  const used = budget
    ? Math.min(
        100,
        Math.round(
          ((budget.week.spent + budget.week.reserved) /
            budget.plan.weeklyCredits) *
            1000,
        ) / 10,
      )
    : 0;
  return (
    <main className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${sidebar ? styles.visible : ""}`}
        aria-label="Conversations"
      >
        <div className={styles.sideHeader}>
          <strong className={styles.brand}>
            <HatcherMark size={28} /> Hatcher
          </strong>
          <button
            className={styles.mobile}
            aria-label="Close conversations"
            onClick={() => setSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>
        <button
          className={styles.newChat}
          disabled={busy || agentBusy}
          onClick={() => {
            selectAgent(null);
            setModel(
              models.find((item) => item.id === DEFAULT_CHAT_MODEL)?.id ??
                models[0]?.id ??
                "",
            );
            ++selection.current;
            setSelected(null);
            setTurns([]);
            setPrompt("");
            setError("");
            setSidebar(false);
          }}
        >
          <Plus size={17} /> New chat
        </button>
        <nav className={styles.sideNav} aria-label="Explore Hatcher">
          <button
            type="button"
            aria-current={!agentId ? "page" : undefined}
            disabled={busy || agentBusy}
            onClick={() => selectAgent(null)}
          >
            <PenLine size={17} /> Web Chat
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPlans(true);
              setSidebar(false);
            }}
          >
            <CreditCard size={17} />
            Plans &amp; credits
          </button>
          <Link href="/platform" onClick={rememberDraft}>
            <Globe size={17} />
            Full Hatcher site
            <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className={styles.sideScroll}>
          {agentsEnabled && (
            <section
              ref={agentList}
              tabIndex={-1}
              className={styles.agentsSection}
              aria-label="My agents"
            >
              <div className={styles.sectionHeading}>
                <h2>My agents</h2>
                {!guest && (
                  <button
                    type="button"
                    aria-label="Create agent"
                    title="Create agent"
                    disabled={busy || agentBusy}
                    onClick={() => {
                      setShowCreateAgent(true);
                      setSidebar(false);
                    }}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              {guest ? (
                <p className={styles.historyHint}>
                  Create and chat with your own agents.
                  <br />
                  <Link
                    onClick={rememberDraft}
                    href={loginHrefForReturn(
                      searchParams.has("agent")
                        ? `/?agent=${encodeURIComponent(searchParams.get("agent")!)}`
                        : "/?agents=1",
                    )}
                  >
                    Log in to your agents
                  </Link>
                </p>
              ) : (
                <>
                  {agentsLoading && !agents.length && (
                    <p role="status" className={styles.historyHint}>
                      Loading agents…
                    </p>
                  )}
                  {agentsError && (
                    <div role="alert" className={styles.historyHint}>
                      {agentsError}{" "}
                      <button onClick={() => void loadAgents()}>Retry</button>
                    </div>
                  )}
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      className={styles.agentRow}
                      aria-current={agentId === agent.id ? "page" : undefined}
                      disabled={busy || agentBusy}
                      onClick={() => selectAgent(agent.id)}
                    >
                      <Bot size={17} />
                      <span>
                        <strong>{agent.name}</strong>
                        <small>
                          {agent.framework} · {agent.status}
                        </small>
                      </span>
                    </button>
                  ))}
                  {!agentsLoading && !agentsError && !agents.length && (
                    <p className={styles.historyHint}>
                      Your agents will appear here.
                    </p>
                  )}
                  <button
                    className={styles.createAgentLink}
                    disabled={busy || agentBusy}
                    onClick={() => {
                      setShowCreateAgent(true);
                      setSidebar(false);
                    }}
                  >
                    <Plus size={15} /> Create an agent
                  </button>
                </>
              )}
            </section>
          )}
          <div className={styles.sectionHeading}>
            <h2>Web Chat history</h2>
          </div>
          <label className={styles.historySearch}>
            <Search size={15} aria-hidden="true" />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
            />
          </label>
          <div className={styles.history}>
            {historyQuery &&
              !chats.some((chat) =>
                chat.title.toLowerCase().includes(historyQuery.toLowerCase()),
              ) && (
                <p className={styles.historyHint}>No matching conversations.</p>
              )}
            {!chats.length && !historyQuery && (
              <p className={styles.historyHint}>
                Your conversations will appear here.
              </p>
            )}
            {chats
              .filter((chat) =>
                chat.title.toLowerCase().includes(historyQuery.toLowerCase()),
              )
              .map((chat) => (
                <div className={styles.historyRow} key={chat.id}>
                  <button
                    aria-current={
                      !agentId && selected === chat.id ? "page" : undefined
                    }
                    disabled={busy || agentBusy}
                    onClick={() => {
                      selectAgent(null);
                      void open(chat.id);
                    }}
                  >
                    {chat.title}
                  </button>
                  <button
                    aria-label={`Delete ${chat.title}`}
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm("Delete this conversation?")) return;
                      try {
                        await chatRequest(`/conversations/${chat.id}`, {
                          method: "DELETE",
                        });
                        if (selected === chat.id) {
                          setSelected(null);
                          setTurns([]);
                        }
                        await refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
        <div className={styles.usage}>
          {guest ? (
            <>
              <strong>
                {account?.guestAllowance?.remaining ?? "…"} free messages left
              </strong>
              <small>
                Up to 5 messages per day per network. Maximum $0.50 of model
                usage; resets at midnight UTC.
              </small>
              <Link
                href="/register?return=%2F"
                onClick={rememberDraft}
                className={styles.signup}
              >
                Create an account
              </Link>
              <small>Keep your chats and unlock more.</small>
              <Link href="/login?return=%2F" onClick={rememberDraft}>
                Already have an account? Log in
              </Link>
            </>
          ) : (
            <>
              <strong>
                {budget
                  ? account?.plans.find((p) => p.id === budget.plan.planId)
                      ?.name
                  : "Your Chat plan"}
              </strong>
              {budget && (
                <>
                  <div className={styles.usageLabel}>
                    <span>Weekly usage</span>
                    <span>{used}%</span>
                  </div>
                  <progress value={used} max={100} aria-label="Weekly usage" />
                  <small>
                    Resets {new Date(budget.week.resetsAt).toLocaleString()}
                  </small>
                  {budget.week.reserved > 0 && (
                    <small>
                      {numberFormat.format(budget.week.reserved)} credits
                      reserved for replies
                    </small>
                  )}
                </>
              )}
              <small>
                {numberFormat.format(account?.walletBalance ?? 0)} account AI
                Credits available
              </small>
              <button onClick={() => setShowPlans((v) => !v)}>
                View plans
              </button>
              <Link href="/dashboard">Full workspace ↗</Link>
            </>
          )}
        </div>
      </aside>
      <div className={styles.workspace}>
        {agentId && (
          <section className={styles.agentPane} aria-label="Agent workspace">
            <header className={styles.header}>
              <button
                className={styles.mobile}
                aria-label="Open conversations"
                onClick={() => setSidebar(true)}
              >
                <Menu size={20} />
              </button>
              <span className={styles.agentMode}>Agent chat</span>
              <div className={styles.headerActions}>
                <button
                  aria-label="Toggle color theme"
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                >
                  <Sun size={17} />
                </button>
              </div>
            </header>
            <AgentWorkspace
              key={agentId}
              id={agentId}
              embedded
              onAgentChange={updateAgent}
              onBusyChange={setAgentBusy}
            />
          </section>
        )}
        <section
          hidden={Boolean(agentId)}
          className={`${styles.chat} ${!loading && turns.length === 0 ? styles.welcome : ""}`}
        >
          <header className={styles.header}>
            <button
              className={styles.mobile}
              aria-label="Open conversations"
              onClick={() => setSidebar(true)}
            >
              <Menu size={20} />
            </button>
            <select
              aria-label="Model"
              value={model}
              disabled={busy || !models.length}
              onChange={(e) => setModel(e.target.value)}
            >
              {!models.length && <option value="">Models unavailable</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className={styles.headerActions}>
              <Link
                href="/platform"
                onClick={rememberDraft}
                className={styles.fullSiteLink}
              >
                Full site <ArrowUpRight size={13} />
              </Link>
              {guest && (
                <button type="button" onClick={() => setShowPlans(true)}>
                  Plans
                </button>
              )}
              <button
                aria-label="Toggle color theme"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                <Sun size={17} />
              </button>
              {guest ? (
                <Link
                  href="/login?return=%2F"
                  onClick={rememberDraft}
                  className={styles.exit}
                >
                  Log in
                </Link>
              ) : (
                <>
                  <button onClick={() => setShowPlans((v) => !v)}>
                    {budget
                      ? `${used}% used`
                      : `${numberFormat.format(account?.walletBalance ?? 0)} credits`}
                  </button>
                  <Link
                    href="/dashboard"
                    className={styles.exit}
                    aria-label="Exit"
                  >
                    <LogOut size={15} /> <span>Workspace</span>
                  </Link>
                </>
              )}
            </div>
          </header>
          {guest && account?.guestAllowance?.remaining === 0 && (
            <div className={styles.error}>
              Your free messages are used up for today.{" "}
              <Link href="/register?return=%2F" onClick={rememberDraft}>
                Create an account to continue
              </Link>
              .
            </div>
          )}
          {error && (
            <div role="alert" className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.messages} aria-busy={busy}>
            {loading ? (
              <p className={styles.empty}>Loading your chats…</p>
            ) : turns.length === 0 ? (
              <div className={styles.welcomeIdentity}>
                <div className={styles.welcomeArtwork}>
                  <NextImage
                    src="/landing-v3/hero-agent-room-hatchling.webp"
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 760px) 100vw, 760px"
                    className={styles.welcomeImage}
                  />
                </div>
                <div className={styles.welcomeScrim} />
                <div className={styles.welcomeCopy}>
                  <span className={styles.welcomeEyebrow}>
                    A little curiosity. A new possibility.
                  </span>
                  <h1>What can we help you hatch?</h1>
                  <p>
                    {guest
                      ? "An idea, a plan, a first draft. Start a conversation, on us."
                      : "Start a conversation. Make it your own."}
                  </p>
                </div>
              </div>
            ) : (
              turns.map((turn) => (
                <article className={styles.turn} key={turn.id}>
                  <div className={styles.prompt}>{turn.prompt}</div>
                  <div className={styles.answer}>
                    <RichMarkdown
                      content={
                        turn.response ||
                        (turn.status === "running"
                          ? "Thinking…"
                          : "No response received.")
                      }
                    />
                  </div>
                  <div className={styles.actions}>
                    <span>
                      {modelNames.get(turn.model) ?? turn.model}
                      {!guest && turn.creditsCharged !== null
                        ? ` · ${numberFormat.format(turn.creditsCharged)} credits`
                        : ""}
                    </span>
                    {turn.status === "pending_usage" && (
                      <span>Usage pending</span>
                    )}
                    <button
                      aria-label="Copy response"
                      disabled={!turn.response}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(turn.response);
                          setCopied(turn.id);
                        } catch {
                          setError("Unable to copy response.");
                        }
                      }}
                    >
                      {copied === turn.id ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setPrompt(turn.prompt)}
                    >
                      Edit &amp; resend
                    </button>
                  </div>
                </article>
              ))
            )}
            <div ref={end} />
          </div>
          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {!guest && (
              <div className={styles.createWrap}>
                <button
                  type="button"
                  className={styles.createButton}
                  aria-label="Create"
                  aria-expanded={createMenu}
                  onClick={() => setCreateMenu((value) => !value)}
                >
                  <WandSparkles size={18} />
                </button>
                {createMenu && (
                  <div className={styles.createMenu}>
                    {(
                      [
                        ["image", Image, "Image"],
                        ["video", Video, "Video"],
                        ["audio", Music2, "Audio"],
                        ["chart", BarChart3, "Market chart"],
                      ] as const
                    ).map(([kind, Icon, label]) => {
                      const toolId =
                        kind === "image"
                          ? "seedream_image"
                          : kind === "video"
                            ? "seedance_video"
                            : kind === "audio"
                              ? "suno_audio"
                              : "";
                      const tool = createTools.find(
                        (item) => item.id === toolId,
                      );
                      return (
                        <button
                          type="button"
                          key={kind}
                          disabled={kind !== "chart" && !tool?.configured}
                          onClick={() => {
                            setCreateMode(kind);
                            setCreateMenu(false);
                          }}
                        >
                          <Icon size={17} />
                          <span>
                            <strong>{label}</strong>
                            <small>
                              {kind === "chart"
                                ? "Live CoinGecko + DexScreener data"
                                : tool?.configured
                                  ? `Est. ${numberFormat.format(tool.estimatedAiCredits)} AI Credits`
                                  : "Unavailable"}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className={styles.composerInput}>
              {createMode && (
                <div className={styles.modeChip}>
                  <span>
                    {createMode === "chart"
                      ? "Live market chart"
                      : `Create ${createMode}`}
                  </span>
                  <button
                    type="button"
                    aria-label="Clear create mode"
                    onClick={() => setCreateMode(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <textarea
                ref={messageInput}
                aria-label="Message"
                placeholder={
                  createMode === "chart"
                    ? "Bitcoin 30d, $HATCHER 7d, or a token address"
                    : createMode
                      ? `Describe the ${createMode} you want`
                      : "Message Hatcher Chat"
                }
                value={prompt}
                maxLength={guest ? 4000 : 16000}
                rows={2}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
            </div>
            {busy ? (
              <button
                type="button"
                aria-label="Stop response"
                onClick={() => controller.current?.abort()}
              >
                <Square size={17} />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send message"
                disabled={
                  !prompt.trim() ||
                  !model ||
                  (guest
                    ? !account?.guestAllowance?.remaining ||
                      !account.guestAllowance.remainingUsd
                    : !budget && (account?.walletBalance ?? 0) <= 0)
                }
              >
                <ArrowUp size={20} />
              </button>
            )}
          </form>
          {!loading && turns.length === 0 && (
            <div className={styles.starters}>
              <div className={styles.suggestions}>
                {[
                  {
                    label: "Research an idea",
                    prompt:
                      "Help me research an idea. Ask me what I have in mind.",
                    Icon: Search,
                  },
                  {
                    label: "Write something",
                    prompt:
                      "Help me write something. Ask me about the audience and what I want to say.",
                    Icon: PenLine,
                  },
                  {
                    label: "Plan my week",
                    prompt:
                      "Help me plan my week. Start by asking about my priorities.",
                    Icon: CalendarDays,
                  },
                ].map(({ label, prompt, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setPrompt(prompt);
                      messageInput.current?.focus();
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              {agentsEnabled && (
                <p className={styles.discovery}>
                  Need tools and a workspace for ongoing tasks?{" "}
                  <button type="button" onClick={exploreAgents}>
                    Explore agents <span aria-hidden="true">↗</span>
                  </button>
                </p>
              )}
              <div
                className={styles.exploreGrid}
                aria-label="More from Hatcher"
              >
                {agentsEnabled && (
                  <button type="button" onClick={exploreAgents}>
                    <Bot size={20} />
                    <strong>Your own agents</strong>
                    <span>
                      OpenClaw, Hermes, or IronClaw. Right here in chat.
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                )}
                <button type="button" onClick={() => setShowPlans(true)}>
                  <CreditCard size={20} />
                  <strong>Find your Chat plan</strong>
                  <span>
                    {account?.plans[0]
                      ? `From ${new Intl.NumberFormat(locale, { style: "currency", currency: account.plans[0].currency }).format(account.plans[0].priceCents / 100)} / 30 days. Or use AI Credits.`
                      : "Compare plans and account AI Credits."}
                  </span>
                  <ArrowUpRight size={15} />
                </button>
                <Link href="/token" onClick={rememberDraft}>
                  <Coins size={20} />
                  <strong>Put HATCHER to work</strong>
                  <span>Discover staking, AI Credits, and token utility.</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          )}
          <p className={styles.footnote}>
            AI can make mistakes. Check important information.{" "}
            {guest && (
              <>
                <Link href="/terms">Terms</Link> ·{" "}
                <Link href="/privacy">Privacy</Link>
              </>
            )}
          </p>
        </section>
      </div>
      {showPlans && (
        <dialog
          ref={plansDialog}
          className={styles.plans}
          aria-labelledby="chat-plans-heading"
          onCancel={(event) => {
            event.preventDefault();
            closePlans();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePlans();
          }}
        >
          <div className={styles.plansHeading}>
            <h2 id="chat-plans-heading">Choose your Chat plan</h2>
            <button type="button" aria-label="Close plans" onClick={closePlans}>
              <X size={20} />
            </button>
          </div>
          <p>30 days of access. Weekly usage resets. No automatic renewal.</p>
          {!account?.plans.length && (
            <p role="status">
              {loading
                ? "Loading current plans…"
                : "Plans could not be loaded."}{" "}
              <Link href="/pricing">View all pricing</Link>
            </p>
          )}
          {checkoutError && <p role="alert" className={styles.error}>{checkoutError}</p>}
          <div className={styles.planGrid}>
            {account?.plans.map((plan) => (
              <article key={plan.id}>
                <h3>{plan.name}</h3>
                <strong>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: plan.currency,
                  }).format(plan.priceCents / 100)}{" "}
                  <small>/ 30 days</small>
                </strong>
                <p>
                  <strong>
                    {numberFormat.format(plan.weeklyCredits * 5)} credits / 30
                    days
                  </strong>
                  <br />
                  {numberFormat.format(plan.weeklyCredits)} each week · resets
                  every 7 days
                  <br />
                  {plan.id === "pro"
                    ? "2× more usage than Basic"
                    : plan.id === "max"
                      ? "5.2× more usage than Basic"
                      : "Full model selector, history and charts"}
                </p>
                <ul>
                  <li>All available chat models</li>
                  <li>Charts and rich artifacts</li>
                  <li>Account AI Credits fallback</li>
                </ul>
                {guest ? (
                  <Link
                    className={styles.planCta}
                    href="/register?return=%2F%3Fplans%3D1"
                    onClick={rememberDraft}
                  >
                    Create account to choose
                  </Link>
                ) : (
                  <button disabled={buying} onClick={() => void buy(plan.id)}>
                    {buying
                      ? "Opening checkout…"
                      : budget
                        ? "Extend access"
                        : "Get started"}
                  </button>
                )}
              </article>
            ))}
          </div>
          {budget && (
            <p>
              Purchases start after your current paid access ends. Your current
              weekly limit stays the same.
            </p>
          )}
          {account?.queued.map((q) => (
            <p key={q.id}>
              Chat {q.planId} starts {new Date(q.startsAt).toLocaleDateString()}
              .
            </p>
          ))}
          <div className={styles.planFooter}>
            <p>
              Already have AI Credits? Use your account balance without a Chat
              plan. Media and agents use account AI Credits. Agent capacity
              follows your Hatcher plan.
            </p>
            <Link href="/pricing" onClick={rememberDraft}>
              Compare all Hatcher plans <ArrowUpRight size={14} />
            </Link>
            <Link href="/staking" onClick={rememberDraft}>
              Explore HATCHER staking credits <ArrowUpRight size={14} />
            </Link>
          </div>
        </dialog>
      )}
      {showCreateAgent && !guest && (
        <QuickAgentCreate
          onClose={() => setShowCreateAgent(false)}
          onCreated={(agent) => {
            updateAgent(agent);
            setShowCreateAgent(false);
            selectAgent(agent.id);
          }}
        />
      )}
    </main>
  );
}
