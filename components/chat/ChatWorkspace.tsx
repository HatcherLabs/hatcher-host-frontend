"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

import { loginHrefForReturn } from "@/lib/safe-redirect";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/routing";
import {
  ArrowUp,
  PenLine,
  CalendarDays,
  CreditCard,
  ArrowUpRight,
  Search,
  BarChart3,
  Check,
  Copy,
  Image,
  Music2,
  LoaderCircle,
  Plus,
  Square,
  Video,
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
import CanvasMedia from "./CanvasMedia";
import ChatModelPicker from "./ChatModelPicker";
import { studioKind, studioMediaUrls } from "@/lib/studio";
import { RichMarkdown } from "@/components/agents/tabs/ChatTab/ArtifactRenderer";
import { ChatHistory } from "./ChatHistory";
import { ChatHandoff } from "./ChatHandoff";
import { ChatResultPanel } from "./ChatResultPanel";
import {
  draftKey,
  readDraft,
  writeDraft,
  messageWithAttachments,
  resultTitle,
  type TextAttachment,
} from "@/lib/chat-workspace";
import experience from "./ChatExperience.module.css";
import {
  Paperclip,
  Globe,
  PanelRightOpen,
  FileText,
  ArrowDown,
} from "lucide-react";
import styles from "./ChatWorkspace.module.css";
import { ChatPlanCatalog } from "./ChatPlanCatalog";

const StudioWorkspace = dynamic(() => import("./StudioWorkspace"));

export default function ChatWorkspace({
  guest = false,
  guestIntroduction,
}: {
  guest?: boolean;
  guestIntroduction?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<ChatAccount | null>(null);
  const workspace = useWorkspace();
  const { user } = useAuth();
  const t = useTranslations("chatExperience");
  const entry = useTranslations("chatEntry");
  const mode = ["canvas", "studio"].includes(searchParams.get("mode") || "")
    ? "canvas"
    : "chat";
  const [studioBusy, setStudioBusy] = useState(false);
  const chatRequest = guest ? guestChatRequest : paidRequest;
  const sendChat = (
    id: string,
    prompt: string,
    model: string,
    signal: AbortSignal,
    delta: (text: string) => void,
  ) =>
    sendRequest(id, prompt, model, signal, delta, undefined, guest, webSearch);
  const rememberDraft = () => {
    try {
      sessionStorage.setItem("hatcher-chat-draft", prompt);
    } catch {}
  };
  const locale = useLocale();
  const [models, setModels] = useState<ChatModel[]>([]);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [prompt, updatePrompt] = useState("");
  const [attachments, updateAttachments] = useState<TextAttachment[]>([]);
  const draftStorageKey = useRef("");
  const promptRef = useRef("");
  const attachmentsRef = useRef<TextAttachment[]>([]);
  const setPrompt = useCallback((value: string) => {
    promptRef.current = value;
    updatePrompt(value);
    if (draftStorageKey.current)
      writeDraft(draftStorageKey.current, {
        text: value,
        attachments: attachmentsRef.current,
      });
  }, []);
  const setAttachments = (value: TextAttachment[]) => {
    attachmentsRef.current = value;
    updateAttachments(value);
    if (draftStorageKey.current)
      writeDraft(draftStorageKey.current, {
        text: promptRef.current,
        attachments: value,
      });
  };
  const switchDraft = useCallback(
    (id: string | null) => {
      draftStorageKey.current = draftKey(user?.id ?? "guest", id);
      const draft = readDraft(draftStorageKey.current);
      promptRef.current = draft.text;
      attachmentsRef.current = draft.attachments;
      updatePrompt(draft.text);
      updateAttachments(draft.attachments);
    },
    [user?.id],
  );
  const [webSearch, setWebSearch] = useState<"auto" | "off">("auto");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [resultId, setResultId] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [nearBottom, setNearBottom] = useState(true);
  const nearBottomRef = useRef(true);
  const scrollArea = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeId = useRef<string | null>(null);
  const routeLoaded = useRef<string | null | undefined>(undefined);
  const lastUser = useRef<string | undefined>(undefined);
  const requestedId = searchParams.get("conversation");
  const setConversationUrl = (id: string | null, replace = false) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("conversation", id);
    else url.searchParams.delete("conversation");
    url.searchParams.delete("mode");
    window.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      url.pathname + url.search,
    );
  };
  const adoptConversation = (chat: Conversation) => {
    activeId.current = chat.id;
    routeLoaded.current = chat.id;
    setSelected(chat.id);
    setSelectedTitle(chat.title);
    switchDraft(chat.id);
    setConversationUrl(chat.id, true);
  };
  const closeResult = useCallback(() => setResultId(null), []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const plansDialog = useRef<HTMLDialogElement>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [planCategory, setPlanCategory] = useState<"agents" | "credits">(
    "agents",
  );
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
    const data = await chatRequest<ChatAccount>("/account");
    setAccount(data);
    setHistoryRevision((value) => value + 1);
  }, [chatRequest]);
  useEffect(() => {
    let disposed = false;
    Promise.all([
      chatRequest<ChatAccount>("/account"),
      chatRequest<{ models: ChatModel[] }>("/models"),
      chatRequest<{ tools: ChatCreateTool[] }>("/create/config"),
    ])
      .then(([a, m, tools]) => {
        if (!disposed) {
          setAccount(a);
          setModels(m.models);
          setModel(current => current || m.models.find((item) => item.id === DEFAULT_CHAT_MODEL)?.id || m.models[0]?.id || "");
          setCreateTools(tools.tools);
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
    if (nearBottomRef.current) {
      const area = scrollArea.current;
      if (area) area.scrollTop = area.scrollHeight;
    }
  }, [turns]);
  useEffect(() => {
    if (!createMenu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreateMenu(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [createMenu]);
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
        ["media/video/google/veo-3.1-lite", "Veo 3.1 Lite"],
        ["media/video/alibaba/wan-2.6", "Wan 2.6"],
        ["media/audio/google/lyria-3-clip-preview", "Lyria 3 Clip"],
      ]),
    [models],
  );
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const open = useCallback(
    async (id: string, preserveError = false) => {
      const epoch = ++selection.current;
      if (!preserveError) setError("");
      workspace?.closeSidebar();
      try {
        const chat = await chatRequest<Conversation & { turns: ChatTurn[] }>(
          `/conversations/${id}`,
        );
        if (epoch === selection.current) {
          setSelectedTitle(chat.title);
          setModel(chat.model);
          setTurns(chat.turns);
        }
        return chat;
      } catch (e) {
        if (epoch === selection.current) setError((e as Error).message);
        return null;
      }
    },
    [chatRequest, workspace],
  );
  const selectConversation = (chat: Conversation | null) => {
    if (busy || studioBusy) return;
    setConversationUrl(chat?.id ?? null);
    workspace?.closeSidebar();
  };
  useEffect(() => {
    if (routeLoaded.current === requestedId && lastUser.current === user?.id)
      return;
    lastUser.current = user?.id;
    controller.current?.abort();
    ++selection.current;
    routeLoaded.current = requestedId;
    activeId.current = requestedId;
    setSelected(requestedId);
    setSelectedTitle("");
    setTurns([]);
    setResultId(null);
    setError("");
    switchDraft(requestedId);
    nearBottomRef.current = true;
    setNearBottom(true);
    if (requestedId) void open(requestedId);
  }, [requestedId, user?.id, switchDraft, open]);
  const newChat = () => {
    if (busy || studioBusy) return;
    if (selected === null) {
      setPrompt("");
      setAttachments([]);
      setTurns([]);
      setError("");
    }
    selectConversation(null);
  };
  const onRemoved = (id: string) => {
    if (activeId.current === id) {
      writeDraft(draftKey(user?.id ?? "guest", id), {
        text: "",
        attachments: [],
      });
      selectConversation(null);
    }
  };
  const attachFiles = async (files: FileList | null) => {
    if (!files) return;
    const attachmentKey = draftStorageKey.current;
    try {
      const added: TextAttachment[] = [];
      for (const file of Array.from(files)) {
        if (!/\.(txt|md|csv|json|log)$/i.test(file.name) || file.size > 48000)
          throw new Error(t("fileError"));
        const content = await file.text();
        if (content.includes("\0")) throw new Error(t("fileError"));
        added.push({ name: file.name, content });
      }
      if (attachmentKey !== draftStorageKey.current) return;
      const next = [...attachmentsRef.current, ...added];
      if (
        next.length > 5 ||
        next.reduce((sum, file) => sum + file.content.length, 0) > 12000
      )
        throw new Error(t("fileError"));
      setAttachments(next);
      setCreateMode(null);
      setCreateMenu(false);
    } catch (error) {
      setError((error as Error).message);
    }
    if (fileInput.current) fileInput.current.value = "";
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
          if (result.done || result.turn.status === "failed") {
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
      const kind = studioKind(turn.model);
      if (kind) void pollGeneration(turn.id, kind);
    }
  }, [turns, pollGeneration]);
  const createMedia = async (kind: ChatCreateKind, text: string) => {
    setBusy(true);
    setError("");
    setPrompt("");
    let id = selected;
    const startingSelection = selection.current;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        if (selection.current !== startingSelection) return;
        id = chat.id;
        adoptConversation(chat);
      }
      const result = await chatRequest<{ turn: ChatTurn; done: boolean }>(
        "/create",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            conversationId: id,
            kind,
            prompt: text.trim(),
          }),
        },
      );
      if (activeId.current === id) setTurns((previous) => [...previous, result.turn]);
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
    const startingSelection = selection.current;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        if (selection.current !== startingSelection) return;
        id = chat.id;
        adoptConversation(chat);
      }
      const result = await chatRequest<{ turn: ChatTurn }>("/chart", {
        method: "POST",
        body: JSON.stringify({ conversationId: id, prompt: text.trim() }),
      });
      if (activeId.current === id) setTurns((previous) => [...previous, result.turn]);
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
    const composed = messageWithAttachments(text, attachments);
    if (composed.length > (guest ? 4000 : 16000)) {
      setError(guest ? entry("guestPromptLimit") : t("promptTooLong"));
      return;
    }
    const sentAttachments = attachments;
    nearBottomRef.current = true;
    setNearBottom(true);
    setBusy(true);
    setError("");
    setPrompt("");
    setAttachments([]);
    const abort = new AbortController();
    controller.current = abort;
    let id = selected;
    const startingSelection = selection.current;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ model }),
        });
        if (selection.current !== startingSelection) return;
        id = chat.id;
        adoptConversation(chat);
      }
      if (abort.signal.aborted) return;
      const turn: ChatTurn = {
        id: "sending",
        prompt: composed,
        response: "",
        model,
        status: "running",
        creditsCharged: null,
      };
      setTurns((previous) => [...previous, turn]);
      await sendChat(id, composed, model, abort.signal, (delta) =>
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
        if (activeId.current === id) {
          setPrompt(text);
          setAttachments(sentAttachments);
        }
      }
    } finally {
      controller.current = null;
      await refresh().catch(() => undefined);
      if (id && activeId.current === id) {
        for (const delay of [0, 250, 750, 1500]) {
          if (delay)
            await new Promise((resolve) => window.setTimeout(resolve, delay));
          if (activeId.current !== id) break;
          const chat = await open(id, true);
          if (!chat?.turns.some((turn) => turn.status === "running")) break;
        }
      }
      setBusy(false);
    }
  };
  const budget = account?.budget;
  const activeResult = turns.find((turn) => turn.id === resultId);
  const latestResult = [...turns].reverse().find((turn) => turn.response);
  const history = (
    <ChatHistory
      request={chatRequest}
      selected={selected}
      busy={busy || studioBusy}
      revision={historyRevision}
      onSelect={selectConversation}
      onNew={newChat}
      onRemoved={onRemoved}
      onChanged={(chat) => {
        if (chat.id === selected) setSelectedTitle(chat.title);
      }}
      onError={setError}
      openSidebar={workspace?.openSidebar ?? (() => undefined)}
    />
  );
  const suggestions = (
              <div className={experience.suggestions}>
                {[
                  {
                    key: "research",
                    Icon: Search,
                    prompt:
                      "Help me research an idea. Ask me what I have in mind.",
                  },
                  {
                    key: "write",
                    Icon: PenLine,
                    prompt:
                      "Help me write something. Ask me about my audience and what I want to say.",
                  },
                  {
                    key: "plan",
                    Icon: CalendarDays,
                    prompt:
                      "Help me plan my week. Start by asking about my priorities.",
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setPrompt(t(item.key));
                      messageInput.current?.focus();
                    }}
                  >
                    <item.Icon size={15} />
                    {t(item.key)}
                  </button>
                ))}
              </div>);
  const header = (
    <>
      <div className={experience.headerIdentity}>
        <span className={experience.conversationHeading}>
          {mode === "canvas" ? t("canvas") : selectedTitle || t("newChatTitle")}
        </span>
        {mode === "chat" && <span className={experience.desktopModel}><ChatModelPicker
            models={models}
            value={model}
            disabled={busy}
            onChange={setModel}
          /></span>}
      </div>
      <div className={experience.headerActions}>
        {mode === "chat" && !guest && turns.length > 0 && (
          <button
            disabled={busy}
            onClick={() => setHandoffOpen(true)}
            title={t("continueWithAgent")}
          >
            <ArrowUpRight size={16} />
            <span>{t("continueWithAgent")}</span>
          </button>
        )}
        {mode === "chat" && latestResult && (
          <button
            onClick={() => setResultId(latestResult.id)}
            aria-label={t("openResult")}
          >
            <PanelRightOpen size={18} />
          </button>
        )}
      </div>
    </>
  );
  return (
    <div className={experience.chatLayout}>
      {workspace?.chatTarget && createPortal(history, workspace.chatTarget)}
      {workspace?.headerTarget && createPortal(header, workspace.headerTarget)}
      <div className={experience.chatMain}>
        {mode === "canvas" && (
          <StudioWorkspace
            guest={guest}
            onMenu={() => workspace?.openSidebar()}
            onPlans={() => setShowPlans(true)}
            onBusyChange={setStudioBusy}
            onAccountChange={refresh}
          />
        )}
        <section
          hidden={mode !== "chat"}
          className={`${experience.chatPane} ${!loading && turns.length === 0 ? experience.emptyChat : ""}`}
        >
          {error && (
            <div role="alert" className={experience.error}>
              {error}
              <button aria-label={t("close")} onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          <div
            ref={scrollArea}
            className={experience.messages}
            aria-busy={busy}
            onScroll={() => {
              const area = scrollArea.current;
              if (!area) return;
              const near =
                area.scrollHeight - area.scrollTop - area.clientHeight < 100;
              nearBottomRef.current = near;
              setNearBottom(near);
            }}
          >
            {loading ? (
              <p role="status" className={experience.welcomeDescription}>
                {t("loading")}
              </p>
            ) : turns.length === 0 ? (
              <div className={experience.welcome}>
                <span className={experience.welcomeMark} aria-hidden="true">H.</span>
                <h1>{t("welcome")}</h1>
                <p>{t("welcomeDescription")}</p>
                {suggestions}
              </div>
            ) : (
              turns.map((turn) => (
                <article className={experience.turn} key={turn.id}>
                  <div className={experience.prompt}>{turn.prompt}</div>
                  <div className={experience.answer}>
                    {(studioKind(turn.model) === "video" ||
                      studioKind(turn.model) === "audio") &&
                    studioMediaUrls(turn.response).length ? (
                      studioMediaUrls(turn.response).map((url) => (
                        <CanvasMedia
                          key={url}
                          path={url}
                          kind={
                            studioKind(turn.model) === "video"
                              ? "video"
                              : "audio"
                          }
                          title={turn.prompt}
                        />
                      ))
                    ) : (
                      <RichMarkdown
                        content={
                          turn.response ||
                          (turn.status === "running"
                            ? "Thinking…"
                            : "No response received.")
                        }
                      />
                    )}
                  </div>
                  {turn.response && (
                    <button
                      className={experience.resultLink}
                      onClick={() => setResultId(turn.id)}
                    >
                      <FileText size={17} />
                      <span>{resultTitle(turn)}</span>
                      <PanelRightOpen size={16} />
                    </button>
                  )}
                  <div className={experience.responseActions}>
                    <span>
                      {modelNames.get(turn.model) ?? turn.model}
                      {!guest && turn.creditsCharged !== null
                        ? ` · ${numberFormat.format(turn.creditsCharged)} credits`
                        : ""}
                    </span>
                    <button
                      aria-label={t("copyResult")}
                      disabled={!turn.response}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(turn.response);
                          setCopied(turn.id);
                        } catch {
                          setError(t("copyError"));
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
                      onClick={() => {
                        setPrompt(turn.prompt);
                        messageInput.current?.focus();
                      }}
                    >
                      {entry("editResend")}
                    </button>
                    {turn.status === "pending_usage" && (
                      <span>Usage pending</span>
                    )}
                  </div>
                </article>
              ))
            )}
            <div ref={end} />
          </div>
          {!nearBottom && turns.length > 0 && (
            <button
              className={experience.jumpLatest}
              onClick={() => {
                const area = scrollArea.current;
                if (area) area.scrollTop = area.scrollHeight;
                nearBottomRef.current = true;
                setNearBottom(true);
              }}
            >
              <ArrowDown size={15} />
              {t("jumpLatest")}
            </button>
          )}
          <div className={experience.composerArea}>
            <form
              className={experience.composer}
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <input
                ref={fileInput}
                hidden
                type="file"
                multiple
                accept=".txt,.md,.csv,.json,.log"
                onChange={(event) => void attachFiles(event.target.files)}
              />
              {attachments.length > 0 && (
                <div className={experience.attachments}>
                  {attachments.map((file, index) => (
                    <span key={`${file.name}:${index}`}>
                      <Paperclip size={13} />
                      {file.name}
                      <button
                        type="button"
                        aria-label={t("removeAttachment", { name: file.name })}
                        onClick={() =>
                          setAttachments(
                            attachments.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {createMode && (
                <div className={experience.modeChip}>
                  {t(createMode)}
                  <button
                    type="button"
                    aria-label={t("clearMode")}
                    onClick={() => setCreateMode(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <textarea
                disabled={busy}
                ref={messageInput}
                aria-label={t("message")}
                placeholder={
                  createMode
                    ? `Describe the ${createMode} you want`
                    : t("message")
                }
                value={prompt}
                maxLength={guest ? 4000 : 16000}
                rows={2}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className={experience.composerToolbar}>
                <span className={experience.mobileModel}><ChatModelPicker models={models} value={model} disabled={busy} onChange={setModel}/></span>
                <div className={experience.toolAnchor}>
                  <button
                    type="button"
                    className={experience.addButton}
                    aria-label={t("tools")}
                    aria-expanded={createMenu}
                    disabled={busy}
                    onClick={() => setCreateMenu((value) => !value)}
                  >
                    <Plus size={19} />
                  </button>
                  {createMenu && (
                    <>
                      <button
                        type="button"
                        className={experience.dismissTools}
                        aria-label={t("close")}
                        onClick={() => setCreateMenu(false)}
                      />
                      <div className={experience.toolsMenu}>
                        <button
                          type="button"
                          onClick={() => fileInput.current?.click()}
                        >
                          <Paperclip size={17} />
                          <span>
                            <strong>{t("attachText")}</strong>
                            <small>{t("textFileHint")}</small>
                          </span>
                        </button>
                        {(
                          [
                            ["image", Image],
                            ["video", Video],
                            ["audio", Music2],
                            ["chart", BarChart3],
                          ] as const
                        ).map(([kind, Icon]) => {
                          const tool = createTools.find(
                            (item) =>
                              item.id ===
                              (kind === "image"
                                ? "seedream_image"
                                : kind === "video"
                                  ? "seedance_video"
                                  : "suno_audio"),
                          );
                          return (
                            <button
                              key={kind}
                              type="button"
                              disabled={kind !== "chart" && !tool?.configured}
                              onClick={() => {
                                setCreateMode(kind);
                                setAttachments([]);
                                setCreateMenu(false);
                                messageInput.current?.focus();
                              }}
                            >
                              <Icon size={17} />
                              <span>
                                <strong>{t(kind)}</strong>
                                <small>
                                  {kind === "chart"
                                    ? "CoinGecko · DexScreener"
                                    : tool?.configured
                                      ? `~${numberFormat.format(tool.estimatedAiCredits)} AI Credits`
                                      : t("unavailable")}
                                </small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                {!createMode && !guest && (
                  <label className={experience.webSearch} title={t("webHint")}>
                    <Globe size={14} />
                    <select
                      aria-label={t("searchMode")}
                      value={webSearch}
                      disabled={busy}
                      onChange={(event) =>
                        setWebSearch(event.target.value as "auto" | "off")
                      }
                    >
                      <option value="auto">{t("webAuto")}</option>
                      <option value="off">{t("webOff")}</option>
                    </select>
                  </label>
                )}
                {busy ? (
                  <button
                    type="button"
                    className={experience.sendButton}
                    aria-label={t(createMode ? "loading" : "stop")}
                    disabled={!!createMode}
                    onClick={() => controller.current?.abort()}
                  >
                    {createMode ? <LoaderCircle size={16} className="animate-spin" /> : <Square size={16} />}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={experience.sendButton}
                    aria-label={t("send")}
                    disabled={
                      !prompt.trim() ||
                      !model ||
                      loading ||
                      (guest
                        ? !account?.guestAllowance?.remaining
                        : !budget && (account?.walletBalance ?? 0) <= 0)
                    }
                  >
                    <ArrowUp size={19} />
                  </button>
                )}
              </div>
            </form>
            {guest && <p className={experience.footnote}>{entry("guestAllowance", { remaining: account?.guestAllowance?.remaining ?? 0 })} · <Link href={loginHrefForReturn("/")} onClick={rememberDraft}>{entry("signInContinue")}</Link></p>}
            {guest && turns.length === 0 && guestIntroduction && <details className={experience.guestAbout}><summary>{entry("aboutHatcher")}</summary>{guestIntroduction}</details>}
            <p className={experience.footnote}>
              {prompt || attachments.length ? t("draftSaved") : t("footer")}
            </p>
          </div>

        </section>
      </div>
      {activeResult && mode === "chat" && (
        <ChatResultPanel
          key={activeResult.id}
          turn={activeResult}
          onClose={closeResult}
        />
      )}
      {handoffOpen && (
        <ChatHandoff
          turns={turns}
          title={selectedTitle}
          onClose={() => setHandoffOpen(false)}
        />
      )}
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
            <h2 id="chat-plans-heading">Plans &amp; credits</h2>
            <button type="button" aria-label="Close plans" onClick={closePlans}>
              <X size={20} />
            </button>
          </div>
          <div
            className={styles.planTabs}
            role="group"
            aria-label="Plan category"
          >
            {(
              [
                ["agents", "Hatcher Plans"],
                ["credits", "AI Credits"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={planCategory === id}
                onClick={() => setPlanCategory(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <ChatPlanCatalog
            kind={planCategory}
            guest={guest}
            onNavigate={rememberDraft}
          />
          {budget && (
            <p className={styles.planDescription}>
              Your existing Web Chat allowance remains available until{" "}
              {new Date(budget.plan.endsAt).toLocaleDateString()}. New Hatcher
              plans use shared account AI Credits across Chat, agents and
              Canvas.
            </p>
          )}
          {account?.queued.map((q) => (
            <p key={q.id}>
              Previously purchased Chat {q.planId} starts{" "}
              {new Date(q.startsAt).toLocaleDateString()}.
            </p>
          ))}
          <div className={styles.planFooter}>
            <p>
              One plan for Chat, hosted agents and Canvas. Model and media usage
              draw from your shared AI Credits; agent capacity follows your
              plan. Extra credits are available whenever you need them.
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
    </div>
  );
}
