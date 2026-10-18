"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_CHAT_MODEL, type ChatModel } from "@/lib/direct-chat";
import { groupChatModels, modelProvider } from "@/lib/chat-model-groups";
import styles from "./ChatExperience.module.css";
export default function ChatModelPicker({
  models,
  value,
  disabled,
  onChange,
}: {
  models: ChatModel[];
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("chatExperience");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const key = `hatcher.chat.models.v2:${user?.id ?? "guest"}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      setFavorites(
        Array.isArray(saved.favorites)
          ? saved.favorites.filter((x: unknown) => typeof x === "string")
          : [],
      );
      setRecent(
        Array.isArray(saved.recent)
          ? saved.recent.filter((x: unknown) => typeof x === "string")
          : [],
      );
    } catch {
      setFavorites([]);
      setRecent([]);
    }
  }, [key]);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      search.current?.focus();
    } else dialog.current?.close();
  }, [open]);
  const groups = useMemo(() => groupChatModels(models), [models]);
  const selected = models.find((m) => m.id === value);
  const matching = models.filter(
    (m) =>
      (!provider || modelProvider(m.id) === provider) &&
      `${m.name} ${m.id}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const save = (fav: string[], rec: string[]) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ favorites: fav, recent: rec }),
      );
    } catch {}
  };
  const choose = (id: string) => {
    if (disabled) return;
    const next = [id, ...recent.filter((v) => v !== id)].slice(0, 5);
    setRecent(next);
    save(favorites, next);
    onChange(id);
    setOpen(false);
  };
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((v) => v !== id)
      : [...favorites, id];
    setFavorites(next);
    save(next, recent);
  };
  const sections =
    query || provider
      ? [{ key: "allModels", models: matching }]
      : [
          {
            key: "recommended",
            models: models.filter((m) => m.id === DEFAULT_CHAT_MODEL),
          },
          {
            key: "favorites",
            models: models.filter((m) => favorites.includes(m.id)),
          },
          {
            key: "recentModels",
            models: recent
              .map((id) => models.find((m) => m.id === id))
              .filter((m): m is ChatModel => Boolean(m)),
          },
        ];
  return (
    <>
      <button
        type="button"
        className={styles.modelTrigger}
        disabled={disabled || !models.length}
        aria-haspopup="dialog"
        aria-label={t("chooseModel")}
        onClick={() => {
          setProvider("");
          setQuery("");
          setOpen(true);
        }}
      >
        <span>{selected?.name || t("modelsUnavailable")}</span>
        <ChevronDown size={14} />
      </button>
      <dialog
        ref={dialog}
        className={`${styles.dialog} ${styles.modelDialog}`}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) {
            const b = dialog.current.getBoundingClientRect();
            if (
              e.clientX < b.left ||
              e.clientX > b.right ||
              e.clientY < b.top ||
              e.clientY > b.bottom
            )
              setOpen(false);
          }
        }}
      >
        <div className={styles.dialogHeading}>
          <h2>{t("chooseModel")}</h2>
          <button aria-label={t("close")} onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
        </div>
        <label className={styles.modelSearch}>
          <Search size={17} />
          <input
            ref={search}
            aria-label={t("searchModels")}
            placeholder={t("searchModels")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label={t("provider")}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="">{t("allProviders")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div className={styles.modelList}>
          {sections.map(
            (section) =>
              section.models.length > 0 && (
                <section key={section.key}>
                  <h3 className={styles.groupLabel}>{t(section.key)}</h3>
                  {section.models.map((m) => (
                    <div className={styles.modelRow} key={m.id}>
                      <button onClick={() => choose(m.id)} disabled={disabled}>
                        <span>
                          <strong>{m.name}</strong>
                          <small>
                            {modelProvider(m.id)} ·{" "}
                            {Math.round(m.contextLength / 1000)}k {t("context")}
                          </small>
                        </span>
                        {value === m.id && <Check size={16} />}
                      </button>
                      <button
                        aria-label={t(
                          favorites.includes(m.id)
                            ? "removeFavorite"
                            : "addFavorite",
                          { name: m.name },
                        )}
                        aria-pressed={favorites.includes(m.id)}
                        onClick={() => toggleFavorite(m.id)}
                      >
                        <Star
                          size={16}
                          fill={
                            favorites.includes(m.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    </div>
                  ))}
                </section>
              ),
          )}
          {(query || provider) && !matching.length && (
            <p className={styles.hint}>{t("noModels")}</p>
          )}
          {!query && !provider && (
            <div className={styles.providerGrid}>
              <h3 className={styles.groupLabel}>{t("browseProviders")}</h3>
              {groups.map((g) => (
                <button key={g.id} onClick={() => setProvider(g.id)}>
                  {g.name}
                  <small>{g.models.length}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
