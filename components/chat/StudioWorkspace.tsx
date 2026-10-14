"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Film,
  ImageIcon,
  Loader2,
  Menu,
  Music2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  chatRequest,
  DEFAULT_CHAT_MODEL,
  type ChatAccount,
  type ChatCreateKind,
  type ChatCreateTool,
  type ChatModel,
  type Conversation,
} from "@/lib/direct-chat";
import {
  generationModels,
  savedGenerationModel,
  type GenerationModel,
  studioKind,
  studioMediaUrls,
  type StudioAsset,
} from "@/lib/studio";
import styles from "./StudioWorkspace.module.css";

const MODES = [
  {
    id: "image",
    label: "Image",
    Icon: ImageIcon,
    prompt:
      "An editorial product photograph of a silver headphone on warm sandstone, soft morning light, clean composition.",
  },
  {
    id: "video",
    label: "Video",
    Icon: Film,
    prompt:
      "A slow cinematic camera push through a sunlit greenhouse. Leaves move gently in the breeze, warm natural colors.",
  },
  {
    id: "audio",
    label: "Music",
    Icon: Music2,
    prompt:
      "An instrumental electronic track for a product launch. Warm synths, a confident beat, and a spacious, uplifting atmosphere.",
  },
] as const;
type Library = { assets: StudioAsset[]; nextCursor: string | null };

export default function StudioWorkspace({
  guest,
  onMenu,
  onPlans,
  onBusyChange,
  onAccountChange,
}: {
  guest: boolean;
  onMenu: () => void;
  onPlans: () => void;
  onBusyChange: (busy: boolean) => void;
  onAccountChange: () => void | Promise<void>;
}) {
  const [kind, setKind] = useState<ChatCreateKind>("image");
  const [tab, setTab] = useState<"create" | "library">("create");
  const [prompt, setPrompt] = useState("");
  const [tools, setTools] = useState<GenerationModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<
    Partial<Record<ChatCreateKind, string>>
  >({});
  const [balance, setBalance] = useState(0);
  const [model, setModel] = useState("");
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(!guest);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const locked = useRef(false);
  const availableModels = tools.filter((item) => item.kind === kind);
  const tool =
    availableModels.find((item) => item.id === selectedModels[kind]) ??
    availableModels.find((item) => item.default && item.configured) ??
    availableModels.find((item) => item.configured) ??
    availableModels[0];
  const requiredCredits =
    tool?.requiredAiCredits ?? tool?.estimatedAiCredits ?? Infinity;
  const mode = MODES.find((item) => item.id === kind)!;

  const reloadLibrary = useCallback(async () => {
    const result = await chatRequest<Library>("/studio/library");
    setAssets(result.assets);
    setCursor(result.nextCursor);
  }, []);
  const reloadBalance = useCallback(async () => {
    const account = await chatRequest<ChatAccount>("/account");
    setBalance(account.walletBalance);
    await onAccountChange();
  }, [onAccountChange]);
  useEffect(() => {
    if (guest) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      chatRequest<{ tools: ChatCreateTool[]; models?: GenerationModel[] }>(
        "/create/config",
      ),
      chatRequest<ChatAccount>("/account"),
      chatRequest<{ models: ChatModel[] }>("/models"),
      chatRequest<Library>("/studio/library"),
    ])
      .then(([config, account, models, library]) => {
        if (!active) return;
        setTools(generationModels(config));
        setBalance(account.walletBalance);
        setModel(
          models.models.find((item) => item.id === DEFAULT_CHAT_MODEL)?.id ??
            models.models[0]?.id ??
            "",
        );
        setAssets(library.assets);
        setCursor(library.nextCursor);
      })
      .catch((e) => {
        if (active) setError(e.message || "Canvas could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [guest, retry]);

  async function generate() {
    if (
      locked.current ||
      !tool?.configured ||
      !prompt.trim() ||
      !model ||
      guest
    )
      return;
    locked.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      const conversation = await chatRequest<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({ model }),
      });
      const result = await chatRequest<{ turn: StudioAsset; done: boolean }>(
        "/create",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            conversationId: conversation.id,
            kind,
            // Historical image capability IDs are omitted for older API compatibility.
            ...(tool.id === "seedream_image" ? {} : { model: tool.id }),
            prompt: prompt.trim(),
          }),
        },
      );
      setAssets((previous) => [
        result.turn,
        ...previous.filter((asset) => asset.id !== result.turn.id),
      ]);
      setNotice(
        result.done
          ? "Saved to your library."
          : "Generation started. You can leave Canvas and check its status later.",
      );
      await reloadBalance();
    } catch (e) {
      setError(
        `${(e as Error).message} Check your library before starting another generation.`,
      );
      await reloadLibrary().catch(() => undefined);
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function checkStatus(asset: StudioAsset) {
    const assetKind = studioKind(asset.model);
    if (!assetKind || locked.current) return;
    locked.current = true;
    setChecking(asset.id);
    onBusyChange(true);
    setError("");
    try {
      const result = await chatRequest<{ turn: StudioAsset; done: boolean }>(
        "/create/status",
        {
          method: "POST",
          body: JSON.stringify({ turnId: asset.id, kind: assetKind }),
        },
      );
      setAssets((previous) =>
        previous.map((item) => (item.id === asset.id ? result.turn : item)),
      );
      setNotice(
        result.done
          ? "Your creation is ready."
          : "Still generating. Check again in a little while.",
      );
      await reloadBalance();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      locked.current = false;
      setChecking(null);
      onBusyChange(false);
    }
  }
  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const result = await chatRequest<Library>(
        `/studio/library?cursor=${encodeURIComponent(cursor)}`,
      );
      setAssets((previous) => [
        ...previous,
        ...result.assets.filter(
          (item) => !previous.some((asset) => asset.id === item.id),
        ),
      ]);
      setCursor(result.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const shown =
    tab === "library"
      ? assets
      : assets.filter((asset) => studioKind(asset.model) === kind);
  return (
    <section className={styles.studio} aria-label="Hatcher Canvas">
      <header className={styles.header}>
        <button
          className={styles.mobile}
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className={styles.identity}>
          <Sparkles size={18} />
          <strong>Canvas</strong>
          <span>Create something worth sharing.</span>
        </div>
        <button className={styles.balance} onClick={onPlans}>
          {guest ? "Plans & credits" : `${balance.toLocaleString()} AI Credits`}
        </button>
      </header>
      <div className={styles.body}>
        <div className={styles.title}>
          <span>HATCHER CANVAS</span>
          <h1>Your ideas, in every format.</h1>
          <p>Make an image. Set a scene in motion. Find its sound.</p>
        </div>
        <div className={styles.tabs} aria-label="Canvas views">
          <button
            aria-pressed={tab === "create"}
            onClick={() => setTab("create")}
          >
            Create
          </button>
          <button
            aria-pressed={tab === "library"}
            onClick={() => setTab("library")}
          >
            Your library
          </button>
        </div>
        {error && (
          <div role="alert" className={styles.error}>
            {error}{" "}
            <button
              disabled={busy || Boolean(checking)}
              onClick={() => setRetry((value) => value + 1)}
            >
              Refresh Canvas
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}
        {tab === "create" && (
          <div className={styles.createGrid}>
            <section className={styles.composer} aria-label="Create media">
              <div className={styles.modeTabs}>
                {MODES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    disabled={busy}
                    aria-pressed={kind === id}
                    onClick={() => {
                      setKind(id);
                      setNotice("");
                    }}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </div>
              <label className={styles.label} htmlFor="studio-prompt">
                Describe your {kind === "audio" ? "music" : kind}
              </label>
              <textarea
                id="studio-prompt"
                maxLength={4000}
                value={prompt}
                disabled={busy}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={mode.prompt}
              />
              <div className={styles.promptMeta}>
                <button disabled={busy} onClick={() => setPrompt(mode.prompt)}>
                  Try an example
                </button>
                <span>{prompt.length.toLocaleString()} / 4,000</span>
              </div>
              <div className={styles.settings}>
                <label htmlFor="generation-model">Generation model</label>
                {guest ? (
                  <span>Sign in to choose a model</span>
                ) : (
                  <select
                    id="generation-model"
                    value={tool?.id ?? ""}
                    disabled={
                      loading ||
                      busy ||
                      Boolean(checking) ||
                      !availableModels.length
                    }
                    onChange={(event) =>
                      setSelectedModels((previous) => ({
                        ...previous,
                        [kind]: event.target.value,
                      }))
                    }
                  >
                    {!availableModels.length && (
                      <option value="">No models available</option>
                    )}
                    {availableModels.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={!item.configured}
                      >
                        {item.label} · ~{item.estimatedAiCredits} credits
                        {!item.configured ? " (unavailable)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {tool?.description && (
                <p className={styles.hint}>{tool.description}</p>
              )}
              {!guest &&
                !loading &&
                availableModels.filter((item) => item.configured).length ===
                  1 && (
                  <p className={styles.hint}>
                    One model is available for this format right now.
                  </p>
                )}
              <div className={styles.cost}>
                <span>Estimated generation cost</span>
                <strong>
                  {tool
                    ? `~${tool.estimatedAiCredits.toLocaleString()} AI Credits`
                    : "—"}
                </strong>
              </div>
              {tool && (
                <p className={styles.hint}>
                  Final usage may vary.
                  {requiredCredits > tool.estimatedAiCredits
                    ? ` At least ${requiredCredits} credits are needed for the temporary hold; unused credits are released.`
                    : ""}
                </p>
              )}
              {kind !== "image" && tool && (
                <p className={styles.hint}>
                  Status checks cost approximately{" "}
                  {tool.statusCheckAiCredits ?? 1} additional AI Credit(s) each.
                  You choose when to check.
                </p>
              )}
              {guest ? (
                <Link
                  className={styles.primary}
                  href="/login?return=%2F%3Fmode%3Dcanvas"
                >
                  Sign in to create <ArrowUpRight size={16} />
                </Link>
              ) : (
                <button
                  className={styles.primary}
                  onClick={() => void generate()}
                  disabled={
                    loading ||
                    busy ||
                    Boolean(checking) ||
                    !tool?.configured ||
                    !prompt.trim() ||
                    !model ||
                    balance < requiredCredits
                  }
                >
                  {busy ? (
                    <>
                      <Loader2 className={styles.spin} size={17} />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Generate {kind === "audio" ? "music" : kind}
                    </>
                  )}
                </button>
              )}
              {!guest && !loading && tool && !tool.configured && (
                <p className={styles.hint}>
                  This generation service is temporarily unavailable.
                </p>
              )}
              {!guest && tool && balance < requiredCredits && (
                <button className={styles.creditLink} onClick={onPlans}>
                  Add AI Credits to generate
                </button>
              )}
              <p className={styles.hint}>
                Canvas uses the same account AI Credits as Chat and your agents.
                No separate Canvas subscription.
              </p>
            </section>
            <div className={styles.direction}>
              <div className={styles.art} aria-hidden="true">
                <div />
                <div />
                <div />
                <span>
                  <mode.Icon size={34} />
                </span>
              </div>
              <span className={styles.eyebrow}>FROM IDEA TO OUTPUT</span>
              <h2>
                {kind === "image"
                  ? "Make the first impression."
                  : kind === "video"
                    ? "Give the moment motion."
                    : "Set the whole mood."}
              </h2>
              <p>
                {kind === "image"
                  ? "Describe the subject, lighting and composition. Your finished image appears below, ready to download or reuse as inspiration."
                  : kind === "video"
                    ? "Describe a scene, a clear action and a camera movement. Your generation stays in your library while it renders."
                    : "Describe a genre, mood and instruments. Build a soundtrack for your next idea."}
              </p>
              <div className={styles.steps}>
                <span>
                  01 <b>Describe</b>
                </span>
                <span>
                  02 <b>Generate</b>
                </span>
                <span>
                  03 <b>Keep & share</b>
                </span>
              </div>
            </div>
          </div>
        )}
        <section className={styles.library} aria-label="Saved creations">
          <div className={styles.libraryHeading}>
            <div>
              <h2>{tab === "library" ? "Your library" : "Recent creations"}</h2>
              <p>Saved across Chat and Studio.</p>
            </div>
            {!guest && (
              <button
                disabled={loading || busy || Boolean(checking)}
                onClick={() =>
                  void reloadLibrary().catch((e) => setError(e.message))
                }
              >
                <RefreshCw size={15} />
                Refresh library
              </button>
            )}
          </div>
          {loading && <p role="status">Loading Canvas…</p>}
          {!shown.length && !loading && (
            <div className={styles.empty}>
              <ImageIcon size={25} />
              <strong>
                {guest
                  ? "A home for everything you create."
                  : "Your next creation starts here."}
              </strong>
              <p>
                {guest
                  ? "Sign in to generate images, video and music, and keep them together."
                  : "Choose a format and describe your idea. Saved results will appear here."}
              </p>
            </div>
          )}
          <div className={styles.assets}>
            {shown.map((asset) => {
              const assetKind = studioKind(asset.model);
              const urls = studioMediaUrls(asset.response);
              const statusTool =
                tools.find(
                  (item) => item.id === savedGenerationModel(asset.model),
                ) ?? tools.find((item) => asset.model === `media/${item.id}`);
              return (
                <article key={asset.id} className={styles.asset}>
                  {urls.length ? (
                    urls.map((url, index) => (
                      <div key={url} className={styles.preview}>
                        {/* Native images support generated data URLs and arbitrary provider hosts. */}
                        {assetKind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Generated media supports data URLs.
                          <img src={url} alt={asset.prompt} loading="lazy" />
                        ) : assetKind === "video" ? (
                          <video
                            controls
                            preload="metadata"
                            src={url}
                            aria-label={asset.prompt}
                          />
                        ) : (
                          <audio
                            controls
                            preload="none"
                            src={url}
                            aria-label={asset.prompt}
                          />
                        )}
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          download={
                            url.startsWith("data:")
                              ? `hatcher-${asset.id}.png`
                              : undefined
                          }
                          aria-label={`Open or download ${assetKind} ${index + 1}`}
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className={styles.pending}>
                      <Film size={25} />
                      <strong>
                        {asset.status === "generating"
                          ? "Generation in progress"
                          : asset.status === "submitting"
                            ? "Submission awaiting confirmation"
                            : "No output available"}
                      </strong>
                      <p>
                        {asset.status === "generating"
                          ? "Your job is saved. Check when you are ready."
                          : "Refresh the library before trying again."}
                      </p>
                    </div>
                  )}
                  <div className={styles.assetDetails}>
                    <span>
                      {statusTool?.label ?? savedGenerationModel(asset.model)} ·{" "}
                      {asset.creditsCharged == null
                        ? "Usage pending confirmation"
                        : `${asset.creditsCharged} credits used`}
                    </span>
                    <p>{asset.prompt}</p>
                    {asset.status === "generating" && asset.generationId && (
                      <button
                        disabled={busy || Boolean(checking)}
                        onClick={() => void checkStatus(asset)}
                      >
                        {checking === asset.id
                          ? "Checking…"
                          : `Check status (~${statusTool?.statusCheckAiCredits ?? 1} credits)`}
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (assetKind) {
                          setKind(assetKind);
                          if (statusTool)
                            setSelectedModels((previous) => ({
                              ...previous,
                              [assetKind]: statusTool.id,
                            }));
                        }
                        setPrompt(asset.prompt);
                        setTab("create");
                      }}
                    >
                      Reuse prompt
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {cursor && (
            <button
              className={styles.loadMore}
              disabled={loading}
              onClick={() => void loadMore()}
            >
              Load more creations
            </button>
          )}
        </section>
      </div>
    </section>
  );
}
