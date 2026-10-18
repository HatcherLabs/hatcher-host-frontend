"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Bot,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  ListChecks,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  X,
  WandSparkles,
  Globe,
  LogIn,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/mobile-app-links";
import { loginHrefForReturn } from "@/lib/safe-redirect";
import { api, type Agent } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { AiCreditStatus } from "@/components/layout/AiCreditStatus";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { useToast } from "@/components/ui/ToastProvider";
import { WorkspaceContext } from "./WorkspaceContext";
import {
  workspaceAgentId,
  workspaceSection,
  type WorkspaceSection,
} from "./navigation";
import styles from "./WorkspaceShell.module.css";

const NAV = [
  { key: "chats", href: "/dashboard/chat", Icon: MessageSquare },
  { key: "agents", href: "/dashboard/agents", Icon: Bot },
  { key: "canvas", href: "/dashboard/chat?mode=canvas", Icon: WandSparkles },
  { key: "missions", href: "/dashboard/missions", Icon: ListChecks },
  { key: "approvals", href: "/dashboard/approvals", Icon: ShieldCheck },
  { key: "analytics", href: "/dashboard/analytics", Icon: BarChart3 },
] as const;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const t = useTranslations("workspace");
  const entry = useTranslations("chatEntry");
  const { isAuthenticated, user, logout } = useAuth();
  const chatHome = pathname === "/" || !isAuthenticated ? "/" : "/dashboard/chat";
  const destination = (href: string) => href.startsWith("/dashboard/chat") ? href.replace("/dashboard/chat", chatHome) : !isAuthenticated && href.startsWith("/dashboard") ? loginHrefForReturn(href) : href;
  const tStatus = useTranslations("shared.agentStatus");

  const { toast } = useToast();
  const section = workspaceSection(
    pathname,
    params.get("tab"),
    params.get("mode"),
  );
  const agentId = workspaceAgentId(pathname);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  useEffect(() => {
    if (!isAuthenticated) {
      setPendingApprovals(null);
      return;
    }
    let disposed = false;
    const refresh = async () => {
      try {
        const result = await api.getMcpActionInbox({});
        if (!disposed && result.success)
          setPendingApprovals(result.data.summary.pending);
      } catch {
        /* Keep navigation usable when the inbox is unavailable. */
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [isAuthenticated, pathname]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const [chatTarget, setChatTarget] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef(0);
  const selectedAgent = agents.find((a) => a.id === agentId);
  const openSidebar = useCallback(() => {
    setCollapsed(false);
    setMobileOpen(true);
  }, []);
  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  const refreshAgents = useCallback(async () => {
    const request = ++requestRef.current;
    if (!isAuthenticated) {
      setAgents([]);
      setAgentsLoading(false);
      return;
    }
    setAgentsLoading(true);
    try {
      const res = await api.getMyAgents();
      if (request !== requestRef.current) return;
      if (res.success) {
        setAgents(res.data);
        setAgentsError(null);
      } else setAgentsError(res.error);
    } catch {
      if (request === requestRef.current) setAgentsError(t("loadError"));
    } finally {
      if (request === requestRef.current) setAgentsLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    void refreshAgents();
    const refresh = () => void refreshAgents();
    window.addEventListener("focus", refresh);
    const requestCounter = requestRef;
    return () => {
      requestCounter.current++;
      window.removeEventListener("focus", refresh);
    };
  }, [refreshAgents, pathname]);

  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem("hatcher.workspace.sidebar.v1") === "collapsed",
      );
    } catch {
      /* Storage can be unavailable. */
    }
  }, []);
  useEffect(() => {
    setSearch("");
    setMobileOpen(false);
  }, [pathname, section]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    // The same panel is persistent on desktop and a focus-trapped drawer on mobile.
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input, select, [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [mobileOpen, closeSidebar]);

  const value = useMemo(
    () => ({
      agents,
      agentsLoading,
      agentsError,
      refreshAgents,
      chatTarget,
      headerTarget,
      openSidebar,
      closeSidebar,
    }),
    [
      agents,
      agentsLoading,
      agentsError,
      refreshAgents,
      chatTarget,
      headerTarget,
      openSidebar,
      closeSidebar,
    ],
  );
  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen((v) => !v);
      return;
    }
    setCollapsed((v) => {
      try {
        localStorage.setItem(
          "hatcher.workspace.sidebar.v1",
          v ? "expanded" : "collapsed",
        );
      } catch {
        /* Optional preference. */
      }
      return !v;
    });
  };
  const q = search.trim().toLocaleLowerCase();
  const filteredAgents = agents.filter((a) =>
    `${a.name} ${a.framework}`.toLocaleLowerCase().includes(q),
  );
  const contextLinks: Partial<
    Record<WorkspaceSection, { label: string; href: string }[]>
  > = {
    canvas: [
      { label: t("canvasImages"), href: "/dashboard/chat?mode=canvas&kind=image" },
      { label: t("canvasVideo"), href: "/dashboard/chat?mode=canvas&kind=video" },
      { label: t("canvasAudio"), href: "/dashboard/chat?mode=canvas&kind=audio" },
      { label: t("canvasLibrary"), href: "/dashboard/chat?mode=canvas&view=library" },
    ],
    plans: [
      { label: t("subscription"), href: "/dashboard/billing#subscription" },
      { label: t("comparePlans"), href: "/dashboard/billing#plans" },
      { label: "AI Credits", href: "/dashboard/billing#ai-credits" },
      { label: t("addons"), href: "/dashboard/billing#addons" },
      { label: t("payments"), href: "/dashboard/billing#payments" },
    ],
    settings: [
      { label: t("account"), href: "/dashboard/settings" },
      { label: t("apiKeys"), href: "/dashboard/settings/api-keys" },
      { label: t("plans"), href: "/dashboard/billing" },
      ...(user?.isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
    ],
    analytics: [
      { label: t("accountUsage"), href: "/dashboard/analytics" },
      { label: t("plans"), href: "/dashboard/billing" },
    ],
  };
  const listAgents =
    section === "agents" || section === "missions" || section === "approvals";
  function navigateContextLink(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    closeSidebar();
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    const [path, anchor] = href.split("#");
    const target =
      anchor && path === pathname ? document.getElementById(anchor) : null;
    if (!target) return;
    event.preventDefault();
    window.history.pushState(null, "", `#${anchor}`);
    target.scrollIntoView({ block: "start" });
  }
  const agentHref = (id: string) =>
    section === "missions" || section === "approvals"
      ? `/dashboard/${section}?agent=${encodeURIComponent(id)}`
      : `/dashboard/agent/${encodeURIComponent(id)}`;
  async function signOut() {
    try {
      await logout();
      router.push("/");
    } catch {
      toast.error(t("logoutError"));
    }
  }

  return (
    <WorkspaceContext.Provider value={value}>
      <div
        className={styles.shell}
        data-workspace-shell
        data-collapsed={collapsed}
        data-mobile-open={mobileOpen}
      >
        <a className={styles.skip} href="#main-content">
          {t("skip")}
        </a>
        <nav
          className={styles.rail}
          aria-label={t("navigation")}
          data-dashboard-workspace-nav
        >
          <Link
            href="/"
            className={styles.brand}
            aria-label="Hatcher"
          >
            <span>
              H<span className={styles.brandDot}>.</span>
            </span>
          </Link>
          <div className={styles.railMain}>
            {NAV.map(({ key, href, Icon }) => (
              <Link
                key={key}
                href={destination(href)}
                title={t(key)}
                aria-label={t(key)}
                aria-current={section === key ? "page" : undefined}
                className={styles.railLink}
                onClick={closeSidebar}
              >
                <Icon size={21} strokeWidth={1.65} />
                {key === "approvals" &&
                  pendingApprovals !== null &&
                  pendingApprovals > 0 && (
                    <span
                      className={styles.navBadge}
                      aria-label={entry("pendingApprovals", { count: pendingApprovals })}
                    >
                      {pendingApprovals > 99 ? "99+" : pendingApprovals}
                    </span>
                  )}
                <span className={styles.tooltip}>{t(key)}</span>
              </Link>
            ))}
          </div>
          <div className={styles.railBottom}>
            <Link
              href={isAuthenticated ? "/dashboard/billing" : "/pricing"}
              className={styles.railLink}
              title={t("plans")}
              aria-label={t("plans")}
              aria-current={section === "plans" ? "page" : undefined}
              onClick={closeSidebar}
            >
              <CreditCard size={21} strokeWidth={1.65} />
              <span className={styles.tooltip}>{t("plans")}</span>
            </Link>
            <Link
              href="/help"
              className={styles.railLink}
              title={t("help")}
              aria-label={t("help")}
            >
              <HelpCircle size={21} strokeWidth={1.65} />
              <span className={styles.tooltip}>{t("help")}</span>
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard/settings" : loginHrefForReturn("/dashboard/settings")}
              className={styles.railLink}
              aria-label={t("settings")}
              title={t("settings")}
              aria-current={section === "settings" ? "page" : undefined}
            >
              <Settings size={21} strokeWidth={1.65} />
              <span className={styles.tooltip}>{t("settings")}</span>
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard/settings" : loginHrefForReturn("/dashboard/settings")}
              className={styles.avatar}
              title={user?.username ?? t("account")}
              aria-label={t("account")}
            >
              {user?.username?.slice(0, 2).toUpperCase() ?? "H"}
            </Link>
          </div>
        </nav>
        {mobileOpen && (
          <button
            className={styles.scrim}
            onClick={closeSidebar}
            aria-label={t("closeSidebar")}
          />
        )}
        <aside
          id="workspace-sidebar"
          ref={panelRef}
          tabIndex={-1}
          className={styles.sidebar}
          aria-label={t(section)}
          aria-modal={mobileOpen ? true : undefined}
          role={mobileOpen ? "dialog" : undefined}
        >
          <div className={styles.sidebarBrand}>
            <Link href="/">Hatcher</Link>
            <button
              className={styles.iconButton}
              onClick={() => {
                if (mobileOpen) closeSidebar();
                else toggleSidebar();
              }}
              aria-label={t("closeSidebar")}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          <div className={styles.sectionHeading}>
            <h2>{t(section)}</h2>
            {listAgents && <span>{agents.length}</span>}
          </div>
          {section === "agents" && (
            <Link
              href="/create"
              className={styles.primary}
              onClick={closeSidebar}
            >
              <Plus size={17} />
              {t("hatch")}
            </Link>
          )}
          {listAgents && (
            <label className={styles.search}>
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchAgents")}
                aria-label={t("searchAgents")}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label={t("clearSearch")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          )}
          <div className={styles.sidebarBody}>
            {listAgents && (
              <>
                <Link
                  className={styles.row}
                  href={
                    section === "agents"
                      ? "/dashboard/agents"
                      : `/dashboard/${section}`
                  }
                  aria-current={
                    !agentId && !params.get("agent") ? "page" : undefined
                  }
                  onClick={closeSidebar}
                >
                  <LayoutGrid size={16} />
                  {t(
                    section === "agents"
                      ? "allAgents"
                      : section === "missions"
                        ? "allMissions"
                        : "allApprovals",
                  )}
                </Link>
                <p className={styles.listLabel}>{t("yourAgents")}</p>
                {agentsLoading && !agents.length ? (
                  <p className={styles.empty} role="status">
                    {t("loading")}
                  </p>
                ) : null}
                {agentsError && (
                  <div className={styles.empty} role="alert">
                    {t("loadError")}
                    <button onClick={() => void refreshAgents()}>
                      {t("retry")}
                    </button>
                  </div>
                )}
                {!agentsLoading && !agentsError && !filteredAgents.length && (
                  <p className={styles.empty}>
                    {t(search ? "noResults" : "noAgents")}
                  </p>
                )}
                {filteredAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={agentHref(agent.id)}
                    className={styles.agentRow}
                    aria-current={
                      (agentId ?? params.get("agent")) === agent.id
                        ? "page"
                        : undefined
                    }
                    onClick={closeSidebar}
                  >
                    <span className={styles.agentGlyph}>
                      <Bot size={18} strokeWidth={1.6} />
                    </span>
                    <span className={styles.rowBody}>
                      <strong>{agent.name}</strong>
                      <small>
                        <span
                          className={styles.statusDot}
                          data-status={agent.status}
                        />
                        {tStatus.has(agent.status)
                          ? tStatus(agent.status)
                          : agent.status}
                        <span className={styles.framework}>
                          {agent.framework}
                        </span>
                      </small>
                    </span>
                  </Link>
                ))}
              </>
            )}
            {section === "chats" && (
              <div ref={setChatTarget} className={styles.chatTarget} />
            )}
            {contextLinks[section]?.map((link) => (
              <Link
                href={destination(link.href)}
                key={link.href}
                className={styles.row}
                onClick={(event) => navigateContextLink(event, link.href)}
              >
                <span>{link.label}</span>
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
          <div className={styles.sidebarFooter}>
            <Link href="/platform" className={styles.fullWebsite} onClick={closeSidebar}><Globe size={16} />{entry("fullWebsite")}</Link>
            {!isAuthenticated && <Link href={loginHrefForReturn("/")} className={styles.primary}><LogIn size={16} />{entry("signIn")}</Link>}
            {isAuthenticated && (
              <AiCreditStatus variant="drawer" onNavigate={closeSidebar} />
            )}
            <div className={styles.storeLinks}><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">App Store</a><a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">Google Play</a></div>
            <div className={styles.utilities}>
              <LocaleSwitcher />
              <ThemeToggle />
              {isAuthenticated && (
                <button
                  className={styles.iconButton}
                  onClick={() => void signOut()}
                  title={t("signOut")}
                  aria-label={t("signOut")}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </aside>
        <div className={styles.content}>
          <header className={styles.header}>
            <button
              ref={toggleRef}
              className={styles.iconButton}
              onClick={toggleSidebar}
              aria-label={t("toggleSidebar")}
              aria-controls="workspace-sidebar"
              aria-expanded={mobileOpen || !collapsed}
            >
              <PanelLeftOpen size={19} />
            </button>
            {section === "chats" || section === "canvas" ? (
              <div ref={setHeaderTarget} className={styles.headerSlot} />
            ) : (
              <span className={styles.breadcrumb}>
                {t(section)}
                {selectedAgent && (
                  <>
                    <ChevronRight size={13} />
                    <strong>{selectedAgent.name}</strong>
                  </>
                )}
              </span>
            )}
            <div className={styles.headerRight}>
              <Link href="/platform" className={styles.siteLink} title={entry("fullWebsite")} aria-label={entry("fullWebsite")}><Globe size={17} /><span>{entry("fullWebsite")}</span></Link>
              {isAuthenticated && <NotificationCenter />}
              <Link
                href={isAuthenticated ? "/dashboard/billing" : loginHrefForReturn("/")}
                className={styles.planLink}
                data-tour="user-menu"
              >
                {isAuthenticated ? user?.tier ?? "free" : entry("signIn")}
                <ChevronRight size={13} />
              </Link>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className={styles.main}>
            {children}
          </main>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
