"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Conversation } from "@/lib/direct-chat";
import { historyGroup } from "@/lib/chat-workspace";
import styles from "./ChatExperience.module.css";
type Request = <T>(path: string, options?: RequestInit) => Promise<T>;
export function ChatHistory({
  request,
  selected,
  busy,
  revision,
  onSelect,
  onNew,
  onRemoved,
  onChanged,
  onError,
  openSidebar,
}: {
  request: Request;
  selected: string | null;
  busy: boolean;
  revision: number;
  onSelect: (chat: Conversation) => void;
  onNew: () => void;
  onRemoved: (id: string) => void;
  onChanged: (chat: Conversation) => void;
  onError: (message: string) => void;
  openSidebar: () => void;
}) {
  const t = useTranslations("chatExperience");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [items, setItems] = useState<Conversation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [mutation, setMutation] = useState(false);
  const [dialog, setDialog] = useState<{
    chat: Conversation;
    kind: "rename" | "delete";
  } | null>(null);
  const [title, setTitle] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(
    async (next?: string) => {
      const epoch = ++sequence.current;
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        q: search,
        archived: String(archived),
      });
      if (next) params.set("cursor", next);
      try {
        const data = await request<{
          conversations: Conversation[];
          nextCursor?: string | null;
        }>(`/conversations?${params}`);
        if (epoch !== sequence.current) return;
        setItems((previous) =>
          next
            ? [
                ...previous,
                ...data.conversations.filter(
                  (item) => !previous.some((old) => old.id === item.id),
                ),
              ]
            : data.conversations,
        );
        setCursor(data.nextCursor || null);
      } catch (e) {
        if (epoch === sequence.current) setError((e as Error).message);
      } finally {
        if (epoch === sequence.current) setLoading(false);
      }
    },
    [request, search, archived],
  );
  useEffect(() => {
    void load();
    const counter = sequence;
    return () => {
      counter.current++;
    };
  }, [load, revision]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSidebar();
        requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [openSidebar]);
  useEffect(() => {
    if (dialog) modal.current?.showModal();
    else modal.current?.close();
  }, [dialog]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
  async function update(
    chat: Conversation,
    change: { title?: string; isPinned?: boolean; archived?: boolean },
  ) {
    setMutation(true);
    setMenu(null);
    try {
      await request(`/conversations/${encodeURIComponent(chat.id)}`, {
        method: "PATCH",
        body: JSON.stringify(change),
      });
      onChanged({ ...chat, ...change });
      if (change.archived) onRemoved(chat.id);
      setDialog(null);
      await load();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setMutation(false);
    }
  }
  async function remove(chat: Conversation) {
    setMutation(true);
    try {
      await request(`/conversations/${encodeURIComponent(chat.id)}`, {
        method: "DELETE",
      });
      onRemoved(chat.id);
      setDialog(null);
      await load();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setMutation(false);
    }
  }
  const disabled = busy || mutation;
  return (
    <div className={styles.historyPanel}>
      <button className={styles.newChat} disabled={disabled} onClick={onNew}>
        <Plus size={17} />
        {t("newChat")}
      </button>
      <label className={styles.historySearch}>
        <Search size={15} />
        <input
          ref={input}
          value={query}
          maxLength={200}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("search")}
          placeholder={t("search")}
        />
        {query ? (
          <button aria-label={t("clear")} onClick={() => setQuery("")}>
            <X size={14} />
          </button>
        ) : (
          <kbd>⌘/Ctrl K</kbd>
        )}
      </label>
      <div className={styles.historyTabs}>
        <button
          aria-pressed={!archived}
          onClick={() => {
            setArchived(false);
            setMenu(null);
          }}
        >
          {t("recent")}
        </button>
        <button
          aria-pressed={archived}
          onClick={() => {
            setArchived(true);
            setMenu(null);
          }}
        >
          {t("archived")}
        </button>
      </div>
      <div className={styles.historyList} aria-busy={loading}>
        {error && (
          <div role="alert" className={styles.hint}>
            {t("historyError")}{" "}
            <button onClick={() => void load()}>{t("retry")}</button>
          </div>
        )}
        {loading && !items.length && (
          <p role="status" className={styles.hint}>
            {t("loading")}
          </p>
        )}
        {!loading && !error && !items.length && (
          <p className={styles.hint}>
            {t(search ? "noResults" : archived ? "noArchived" : "noChats")}
          </p>
        )}
        {(["pinned", "today", "yesterday", "earlier"] as const).map((group) => {
          const rows = items.filter((chat) => historyGroup(chat) === group);
          if (!rows.length) return null;
          return (
            <section key={group}>
              <h3 className={styles.groupLabel}>{t(group)}</h3>
              {rows.map((chat) => (
                <div
                  key={chat.id}
                  className={styles.historyRow}
                  data-selected={selected === chat.id}
                >
                  <button
                    className={styles.historyTitle}
                    aria-current={selected === chat.id ? "page" : undefined}
                    disabled={disabled}
                    onClick={() => onSelect(chat)}
                  >
                    {chat.isPinned && <Pin size={12} />}
                    <span>{chat.title}</span>
                  </button>
                  <button
                    className={styles.rowMenuButton}
                    aria-label={t("options", { title: chat.title })}
                    aria-expanded={menu === chat.id}
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(menu === chat.id ? null : chat.id);
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menu === chat.id && (
                    <div
                      className={styles.rowMenu}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setTitle(chat.title);
                          setDialog({ chat, kind: "rename" });
                          setMenu(null);
                        }}
                      >
                        <Pencil size={14} />
                        {t("rename")}
                      </button>
                      <button
                        onClick={() =>
                          void update(chat, { isPinned: !chat.isPinned })
                        }
                      >
                        <Pin size={14} />
                        {t(chat.isPinned ? "unpin" : "pin")}
                      </button>
                      <button
                        onClick={() =>
                          void update(chat, { archived: !archived })
                        }
                      >
                        {archived ? (
                          <ArchiveRestore size={14} />
                        ) : (
                          <Archive size={14} />
                        )}{" "}
                        {t(archived ? "restore" : "archive")}
                      </button>
                      <button
                        className={styles.danger}
                        onClick={() => {
                          setDialog({ chat, kind: "delete" });
                          setMenu(null);
                        }}
                      >
                        <Trash2 size={14} />
                        {t("delete")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          );
        })}
        {cursor && (
          <button
            className={styles.loadMore}
            disabled={loading}
            onClick={() => void load(cursor)}
          >
            {t(loading ? "loading" : "loadMore")}
          </button>
        )}
      </div>
      <dialog
        ref={modal}
        className={styles.dialog}
        onCancel={(e) => {
          if (mutation) e.preventDefault();
          else setDialog(null);
        }}
        onClose={() => setDialog(null)}
      >
        {dialog && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dialog.kind === "rename")
                void update(dialog.chat, { title: title.trim() });
              else void remove(dialog.chat);
            }}
          >
            <h2>{t(dialog.kind === "rename" ? "rename" : "deleteTitle")}</h2>
            {dialog.kind === "rename" ? (
              <input
                autoFocus
                aria-label={t("conversationTitle")}
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            ) : (
              <p>{t("deleteDescription", { title: dialog.chat.title })}</p>
            )}
            <div className={styles.dialogActions}>
              <button
                type="button"
                disabled={mutation}
                onClick={() => setDialog(null)}
              >
                {t("cancel")}
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={
                  mutation || (dialog.kind === "rename" && !title.trim())
                }
              >
                <Check size={15} />
                {t(dialog.kind === "rename" ? "save" : "delete")}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
