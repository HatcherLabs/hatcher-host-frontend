"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { guestChatRequest } from "@/lib/direct-chat";
import ChatWorkspace from "./ChatWorkspace";

export function ChatEntry({ introduction }: { introduction?: ReactNode }) {
  const t = useTranslations("chatEntry");
  const { isAuthenticated, isLoading, user } = useAuth();
  const [imported, setImported] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setImported(null);
      return;
    }
    let disposed = false;
    setError("");
    guestChatRequest("/import", { method: "POST" })
      .then(() => {
        if (!disposed) setImported(user.id);
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      });
    return () => {
      disposed = true;
    };
  }, [isAuthenticated, user?.id, retry]);
  if (isLoading || (isAuthenticated && imported !== user?.id))
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[var(--bg-base)] text-[var(--text-primary)]">
        <h1 className="text-2xl font-semibold">Hatcher — Chat, Agents &amp; Canvas</h1>
        <p className="max-w-lg px-4 text-center text-sm text-[var(--text-secondary)]">
          {t("description")}
        </p>
        <Link href="/platform" className="text-sm underline">{t("fullWebsite")}</Link>
        {introduction}
        <p role={error ? "alert" : "status"}>
          {error || t("opening")}
        </p>
        {error && (
          <>
            <button onClick={() => setRetry((value) => value + 1)}>
              {t("retryImport")}
            </button>
            <button onClick={() => setImported(user?.id ?? null)}>
              {t("continueChats")}
            </button>
          </>
        )}
      </main>
    );
  return <ChatWorkspace key={user?.id || "guest"} guest={!isAuthenticated} guestIntroduction={introduction} />;
}
