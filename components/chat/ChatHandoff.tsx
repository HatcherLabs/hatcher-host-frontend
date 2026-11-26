"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import type { ChatTurn } from "@/lib/direct-chat";
import { handoffText } from "@/lib/chat-workspace";
import styles from "./ChatExperience.module.css";
export function ChatHandoff({
  turns,
  title,
  onClose,
}: {
  turns: ChatTurn[];
  title: string;
  onClose: () => void;
}) {
  const t = useTranslations("chatExperience");
  const { user } = useAuth();
  const workspace = useWorkspace();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState("agent");
  const [agent, setAgent] = useState(workspace?.agents[0]?.id || "");
  const [scope, setScope] = useState<"last" | "all">("last");
  const [text, setText] = useState(() => handoffText(turns, "last"));
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const submit = () => {
    if (
      !user ||
      !text.trim() ||
      text.length > 16000 ||
      ((kind === "agent" || kind === "automation") && !agent)
    )
      return;
    const id = crypto.randomUUID();
    const target =
      kind === "agent"
        ? `agent:${agent}`
        : kind === "automation"
          ? "mission"
          : "create";
    try {
      sessionStorage.setItem(
        `hatcher.chat.handoff.v1:${user.id}:${id}`,
        JSON.stringify({
          text: text.trim(),
          title,
          target,
          expires: Date.now() + 30 * 60 * 1000,
        }),
      );
    } catch {
      setError(t("handoffStorageError"));
      return;
    }
    const url =
      kind === "agent"
        ? `/dashboard/agent/${encodeURIComponent(agent)}?tab=chat&handoff=${id}`
        : kind === "automation"
          ? `/dashboard/missions?create=1&agent=${encodeURIComponent(agent)}&handoff=${id}`
          : `/create?handoff=${id}`;
    onClose();
    router.push(url);
  };
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${styles.handoffDialog}`}
      onClose={onClose}
    >
      <div className={styles.dialogHeading}>
        <h2>{t("continueWithAgent")}</h2>
        <button onClick={onClose} aria-label={t("close")}>
          <X size={19} />
        </button>
      </div>
      <p className={styles.hint}>{t("handoffDescription")}</p>
      <label>
        {t("destination")}
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="agent">{t("existingAgent")}</option>
          <option value="create">{t("newAgent")}</option>
          <option value="automation">{t("automationDraft")}</option>
        </select>
      </label>
      {kind !== "create" && (
        <label>
          {t("agent")}
          <select
            aria-label={t("agent")}
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
          >
            <option value="">{t("selectAgent")}</option>
            {workspace?.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {t("contextToTransfer")}
        <select
          value={scope}
          onChange={(e) => {
            const next = e.target.value as "last" | "all";
            setScope(next);
            setText(handoffText(turns, next));
          }}
        >
          <option value="last">{t("lastExchange")}</option>
          <option value="all">{t("wholeConversation")}</option>
        </select>
      </label>
      <textarea
        aria-label={t("reviewContext")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
      />
      <p className={styles.hint}>
        {text.length.toLocaleString()} / 16,000 · {t("handoffDraftOnly")}
      </p>
      {text.length > 16000 && <p role="alert">{t("contextTooLong")}</p>}
      {error && <p role="alert">{error}</p>}
      <div className={styles.dialogActions}>
        <button onClick={onClose}>{t("cancel")}</button>
        <button
          className={styles.primaryButton}
          disabled={
            !text.trim() ||
            text.length > 16000 ||
            ((kind === "agent" || kind === "automation") && !agent)
          }
          onClick={submit}
        >
          {t("openDraft")}
          <ArrowUpRight size={16} />
        </button>
      </div>
    </dialog>
  );
}
