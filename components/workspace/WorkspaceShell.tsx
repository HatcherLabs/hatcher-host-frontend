"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, BarChart3, Bot, ChevronDown, ChevronRight, Compass, CreditCard, Globe, HelpCircle, ListChecks, LogIn, LogOut, Menu, MessageSquare, Network, PanelLeftClose, PanelLeftOpen, Plus, Search, Send, Settings, ShieldCheck, WandSparkles, X, type LucideIcon } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/mobile-app-links";
import { loginHrefForReturn } from "@/lib/safe-redirect";
import { api, type Agent } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppStoreIcon, GooglePlayIcon } from "@/components/ui/StoreIcons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { AiCreditStatus } from "@/components/layout/AiCreditStatus";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { useToast } from "@/components/ui/ToastProvider";
import { NAV_GROUPS, FOOTER_COLUMNS, SOCIAL_LINKS } from "@/components/marketing/v3/links";
import { WorkspaceContext } from "./WorkspaceContext";
import { workspaceAgentId, workspaceSection, type WorkspaceSection } from "./navigation";
import styles from "./WorkspaceShell.module.css";

const NAV: { key: WorkspaceSection; href: string; Icon: LucideIcon }[] = [
  { key: "chats", href: "/", Icon: MessageSquare },
  { key: "agents", href: "/dashboard/agents", Icon: Bot },
  { key: "canvas", href: "/?mode=canvas", Icon: WandSparkles },
  { key: "missions", href: "/dashboard/missions", Icon: ListChecks },
  { key: "discover", href: "/explore", Icon: Compass },
  { key: "website", href: "/platform", Icon: Globe },
];
const AGENT_SECTIONS = new Set<WorkspaceSection>(["agents", "analytics", "compute", "mesh"]);

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const t = useTranslations("workspace");
  const u = useTranslations("unifiedWorkspace");
  const entry = useTranslations("chatEntry");
  const mobile = useTranslations("landingV3.hero");
  const tour = useTranslations("guidedTour");
  const route = pathname + (params.toString() ? `?${params}` : "");
  const [visits, setVisits] = useState<string[]>([]);
  useEffect(() => {
    setVisits(previous => {
      const index = previous.lastIndexOf(route);
      return index >= 0 ? previous.slice(0, index + 1) : [...previous.slice(-49), route];
    });
  }, [route]);
  const groups = useTranslations("nav.groups");
  const nav = useTranslations("nav");
  const footer = useTranslations("footer");
  const status = useTranslations("shared.agentStatus");
  const { isAuthenticated, user, logout } = useAuth();
  const { toast } = useToast();
  const section = workspaceSection(pathname, params.get("tab"), params.get("mode"));
  const [browsingAgents, setBrowsingAgents] = useState(false);
  const sidebarSection = browsingAgents ? "agents" : section;
  const agentId = workspaceAgentId(pathname);
  const backHref = visits.length > 1 ? visits[visits.length - 2] : agentId ? "/dashboard/agents" : section === "plans" ? "/platform" : "/";
  const label = (key: WorkspaceSection) => t.has(key) ? t(key) : u(key);
  const destination = (href: string) => !isAuthenticated && (href.startsWith("/dashboard") || href === "/create") ? loginHrefForReturn(href) : href;
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const [chatTarget, setChatTarget] = useState<HTMLDivElement | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<HTMLDivElement | null>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const [toolsTarget, setToolsTarget] = useState<HTMLDivElement | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<HTMLDivElement | null>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const requestRef = useRef(0);
  const openSidebar = useCallback(() => { setCollapsed(false); setMobileOpen(true); }, []);
  const closeSidebar = useCallback(() => setMobileOpen(false), []);
  const showAgents = () => { setBrowsingAgents(true); setCollapsed(false); if (isMobile) setMobileOpen(true); };
  const navigateFromSidebar = () => { setBrowsingAgents(false); closeSidebar(); };

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => { setIsMobile(query.matches); if (!query.matches) setMobileOpen(false); };
    update(); query.addEventListener("change", update);
    try { setCollapsed(localStorage.getItem("hatcher.workspace.sidebar.v2") === "collapsed"); } catch { /* optional */ }
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--workspace-height");
    const previousCompact = root.getAttribute("data-workspace-compact");
    const update = () => {
      // Android's layout viewport can stay full-height behind the keyboard.
      // Use the visible height, while leaving pinch zoom under browser control.
      if (window.innerWidth < 1024 && Math.abs(viewport.scale - 1) < 0.01) {
        root.style.setProperty("--workspace-height", `${viewport.height}px`);
        root.toggleAttribute("data-workspace-compact", viewport.height < 240 && window.innerHeight - viewport.height > 120);
      } else {
        root.style.removeProperty("--workspace-height");
        root.removeAttribute("data-workspace-compact");
      }
    };
    update();
    viewport.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      if (previous) root.style.setProperty("--workspace-height", previous);
      else root.style.removeProperty("--workspace-height");
      if (previousCompact !== null) root.setAttribute("data-workspace-compact", previousCompact);
      else root.removeAttribute("data-workspace-compact");
    };
  }, []);

  const refreshAgents = useCallback(async () => {
    const request = ++requestRef.current;
    if (!isAuthenticated) { setAgents([]); setAgentsError(null); setAgentsLoading(false); return; }
    setAgentsLoading(true);
    try {
      const res = await api.getMyAgents();
      if (request !== requestRef.current) return;
      if (res.success) { setAgents(res.data); setAgentsError(null); } else setAgentsError(res.error);
    } catch { if (request === requestRef.current) setAgentsError(t("loadError")); }
    finally { if (request === requestRef.current) setAgentsLoading(false); }
  }, [isAuthenticated, t]);
  useEffect(() => {
    void refreshAgents();
    const refresh = () => void refreshAgents();
    window.addEventListener("focus", refresh);
    const counter = requestRef;
    return () => { counter.current++; window.removeEventListener("focus", refresh); };
  }, [refreshAgents]);
  useEffect(() => {
    if (!isAuthenticated) { setPendingApprovals(null); return; }
    let disposed = false;
    const refresh = async () => { try { const r = await api.getMcpActionInbox({}); if (!disposed && r.success) setPendingApprovals(r.data.summary.pending); } catch { /* navigation remains usable */ } };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [isAuthenticated]);
  useEffect(() => { setSearch(""); setBrowsingAgents(false); closeSidebar(); mainRef.current?.scrollTo({ top: 0 }); }, [pathname, section, closeSidebar]);

  useEffect(() => {
    if (!mobileOpen || !isMobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const toggle = toggleRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigationRef.current?.focus();
    navigationRef.current?.scrollTo({ top: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeSidebar(); }
      if (e.key !== "Tab") return;
      const items = Array.from(navigationRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, select, summary, [tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === navigationRef.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === navigationRef.current)) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      requestAnimationFrame(() => (previous?.isConnected ? previous : toggle)?.focus());
    };
  }, [mobileOpen, isMobile, closeSidebar]);

  const value = useMemo(() => ({ agents, agentsLoading, agentsError, refreshAgents, chatTarget, headerTarget, navigationTarget, actionsTarget, toolsTarget, settingsTarget, openSidebar, closeSidebar }), [agents, agentsLoading, agentsError, refreshAgents, chatTarget, headerTarget, navigationTarget, actionsTarget, toolsTarget, settingsTarget, openSidebar, closeSidebar]);
  const toggleSidebar = () => {
    if (isMobile) { setMobileOpen(v => !v); return; }
    setCollapsed(v => { try { localStorage.setItem("hatcher.workspace.sidebar.v2", v ? "expanded" : "collapsed"); } catch { /* optional */ } return !v; });
  };
  const q = search.trim().toLocaleLowerCase();
  const filteredAgents = agents.filter(a => `${a.name} ${a.framework}`.toLocaleLowerCase().includes(q));
  const selectedAgent = agents.find(a => a.id === agentId);
  const isAgentOverview = browsingAgents || (AGENT_SECTIONS.has(section) && !agentId);
  const contextual = !browsingAgents && (!!agentId || pathname === "/dashboard/settings");
  const railActive = (key: WorkspaceSection) => key === sidebarSection || (key === "agents" && AGENT_SECTIONS.has(sidebarSection)) || (key === "missions" && sidebarSection === "approvals");
  const contextLinks: Partial<Record<WorkspaceSection, { label: string; href: string; Icon?: LucideIcon }[]>> = {
    canvas: [{ label: t("canvasImages"), href: "/?mode=canvas&kind=image" }, { label: t("canvasVideo"), href: "/?mode=canvas&kind=video" }, { label: t("canvasAudio"), href: "/?mode=canvas&kind=audio" }, { label: t("canvasLibrary"), href: "/?mode=canvas&view=library" }],
    missions: [{ label: t("allMissions"), href: "/dashboard/missions", Icon: ListChecks }, { label: t("approvals"), href: "/dashboard/approvals", Icon: ShieldCheck }, { label: u("automations"), href: "/dashboard/automations" }],
    plans: [{ label: t("comparePlans"), href: "/pricing" }, ...(isAuthenticated ? [{ label: t("subscription"), href: "/dashboard/billing#subscription" }, { label: "AI Credits", href: "/dashboard/billing#ai-credits" }, { label: t("addons"), href: "/dashboard/billing#addons" }, { label: t("payments"), href: "/dashboard/billing#payments" }] : [])],
    settings: [{ label: t("account"), href: "/dashboard/settings" }, { label: t("apiKeys"), href: "/dashboard/settings/api-keys" }, ...(user?.isAdmin ? [{ label: "Admin", href: "/admin" }] : [])],
    discover: [{ label: groups("publicAgentsLabel"), href: "/explore" }, { label: groups("tradersLabel"), href: "/traders" }],
    help: [{ label: t("help"), href: "/help" }, { label: nav("support"), href: "/support" }, { label: nav("docs"), href: "/docs" }, { label: footer("itemSecurity"), href: "/security" }],
  };
  function contextLink(item: { label: string; href: string; Icon?: LucideIcon }) {
    // These routes live outside app/[locale] and must keep their shared URL.
    const ContextLink = /^\/(?:privacy|terms|cookies|impressum|admin)(?:\/|$)/.test(item.href) ? NextLink : Link;
    const active = pathname === item.href.split(/[?#]/)[0] && !item.href.includes("#") && (!item.href.includes("?") || item.href.split("?")[1].split("&").every(pair => { const [key, val] = pair.split("="); return params.get(key) === val; }));
    return <ContextLink key={item.href} href={destination(item.href)} className={styles.row} aria-current={active ? "page" : undefined} onClick={e => {
      navigateFromSidebar();
      const [path, anchor] = item.href.split("#");
      if (anchor && path === pathname && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = document.getElementById(anchor);
        if (target) { e.preventDefault(); history.pushState(null, "", `#${anchor}`); target.scrollIntoView({ block: "start" }); }
      }
    }}>{item.Icon && <item.Icon size={17} />}<span>{item.label}</span>{!item.Icon && <ChevronRight size={14} />}</ContextLink>;
  }
  async function signOut() { try { await logout(); router.push("/"); } catch { toast.error(t("logoutError")); } }

  return <WorkspaceContext.Provider value={value}>
    <div className={styles.shell} data-workspace-shell data-collapsed={collapsed} data-mobile-open={mobileOpen} data-section={section}>
      <a className={styles.skip} href="#main-content">{t("skip")}</a>
      {mobileOpen && isMobile && <button className={styles.scrim} onClick={closeSidebar} aria-label={u("closeMenu")} tabIndex={-1} />}
      <div id="workspace-navigation" className={styles.navigation} ref={navigationRef} tabIndex={-1} role={mobileOpen && isMobile ? "dialog" : undefined} aria-modal={mobileOpen && isMobile ? true : undefined} aria-label={t("navigation")}>
        <nav className={styles.rail} aria-label={t("navigation")} data-dashboard-workspace-nav>
          <Link href="/" className={styles.brand} aria-label="Hatcher" onClick={navigateFromSidebar}>H<span>.</span></Link>
          <div className={styles.railMain}>{NAV.map(({ key, href, Icon }) => key === "agents" ? <button key={key} type="button" className={styles.railLink} aria-pressed={railActive(key)} aria-controls="workspace-sidebar" onClick={showAgents} title={label(key)}><Icon size={21} strokeWidth={1.65}/><span>{label(key)}</span></button> : <Link key={key} href={destination(href)} className={styles.railLink} aria-current={railActive(key) ? "page" : undefined} onClick={() => { setBrowsingAgents(false); if (isMobile) closeSidebar(); else setCollapsed(false); }} title={label(key)}>
            <Icon size={21} strokeWidth={1.65} /><span>{key === "missions" ? u("railTasks") : label(key)}</span>
            {key === "missions" && !!pendingApprovals && <i className={styles.navBadge}>{pendingApprovals > 99 ? "99+" : pendingApprovals}</i>}
          </Link>)}</div>
          <div className={styles.railBottom}>{[{ key: "plans" as const, href: isAuthenticated ? "/dashboard/billing" : "/pricing", Icon: CreditCard }, { key: "settings" as const, href: "/dashboard/settings", Icon: Settings }, { key: "help" as const, href: "/help", Icon: HelpCircle }].map(({key,href,Icon}) => <Link key={key} href={destination(href)} className={styles.railLink} aria-current={sidebarSection === key ? "page" : undefined} onClick={navigateFromSidebar} title={label(key)}><Icon size={20} strokeWidth={1.65} /><span>{key === "plans" ? u("railPlans") : key === "help" ? u("railHelp") : label(key)}</span></Link>)}</div>
        </nav>
        <aside id="workspace-sidebar" className={styles.sidebar} aria-label={label(sidebarSection)}>
          <div className={styles.sidebarBrand}><Link href="/" onClick={navigateFromSidebar}>Hatcher<span>.</span></Link><button className={styles.iconButton} onClick={isMobile ? closeSidebar : toggleSidebar} aria-label={isMobile ? u("closeMenu") : t("closeSidebar")}>{isMobile ? <X size={20} /> : <PanelLeftClose size={18} />}</button></div>
          <div className={styles.sidebarBack}>
            {browsingAgents ? <button type="button" className={styles.row} onClick={() => setBrowsingAgents(false)}><ArrowLeft size={17}/><span>{tour("back")}</span></button> : pathname !== "/" && <Link href={backHref} className={styles.row} onClick={navigateFromSidebar}><ArrowLeft size={17}/><span>{tour("back")}</span></Link>}
          </div>
          <div className={styles.sidebarBody}>
            {agentId && !browsingAgents ? <>
              <button type="button" className={styles.row} onClick={showAgents}><Bot size={17}/><span>{t("allAgents")}</span><ChevronRight size={14}/></button>
              <label className={styles.agentSwitcher}><Bot size={21} /><select value={selectedAgent?.id ?? ""} aria-label={t("yourAgents")} onChange={e => { router.push(`/dashboard/agent/${encodeURIComponent(e.target.value)}?tab=chat`); closeSidebar(); }}>
                {!selectedAgent && <option value="">{t("loading")}</option>}
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            </> : <h2 className={styles.sectionHeading}>{label(sidebarSection)}</h2>}
            {!browsingAgents && (section === "chats" || agentId) && <div ref={setChatTarget} className={styles.chatTarget} data-agent-history={!!agentId} />}
            <div ref={setNavigationTarget} className={styles.pageNavigation} hidden={browsingAgents} />
            {isAgentOverview && <>
              <Link href={destination("/create")} className={styles.primary} onClick={navigateFromSidebar}><Plus size={17} />{t("hatch")}</Link>
              <label className={styles.search}><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("searchAgents")} aria-label={t("searchAgents")} /></label>
              {agentsLoading && !agents.length && <p role="status" className={styles.empty}>{t("loading")}</p>}
              {agentsError && <div role="alert" className={styles.empty}>{t("loadError")}<button onClick={() => void refreshAgents()}>{t("retry")}</button></div>}
              {!agentsLoading && !agentsError && !filteredAgents.length && <p className={styles.empty}>{t(search ? "noResults" : "noAgents")}</p>}
              {filteredAgents.map(a => <Link key={a.id} href={`/dashboard/agent/${encodeURIComponent(a.id)}?tab=chat`} className={styles.agentRow} onClick={navigateFromSidebar}><span className={styles.agentGlyph}><Bot size={18} /></span><span className={styles.rowBody}><strong>{a.name}</strong><small><i className={styles.statusDot} data-status={a.status} />{status.has(a.status) ? status(a.status) : a.status}</small></span></Link>)}
              <details className={styles.group} open><summary>{u("workspaceTools")}<ChevronDown size={15} /></summary>{contextLink({label:u("manageAgents"),href:"/dashboard/agents",Icon:Bot})}{contextLink({label:t("missions"),href:"/dashboard/missions",Icon:ListChecks})}{contextLink({label:t("approvals"),href:"/dashboard/approvals",Icon:ShieldCheck})}{contextLink({label:t("analytics"),href:"/dashboard/analytics",Icon:BarChart3})}{contextLink({label:u("compute"),href:"/dashboard/compute"})}{contextLink({label:u("mesh"),href:"/dashboard/mesh",Icon:Network})}</details>
            </>}
            {!contextual && (contextLinks[sidebarSection === "approvals" ? "missions" : sidebarSection] ?? []).map(contextLink)}
            {sidebarSection === "website" && <>
              {contextLink({label:u("overview"),href:"/platform"})}
              {NAV_GROUPS[1].items.filter(item => !["publicAgents","traders"].includes(item.key)).map(item => contextLink({label:groups(item.labelKey),href:item.href}))}
              {contextLink({label:t("plans"),href:"/pricing"})}
              <details className={styles.group} open={!["/features", "/frameworks", "/compute"].includes(pathname)}><summary>{u("resources")}<ChevronDown size={15}/></summary>{contextLink({label:nav("docs"),href:"/docs"})}{NAV_GROUPS[2].items.map(item => contextLink({label:groups(item.labelKey),href:item.href}))}</details>
              {contextLink({label:footer("itemSecurity"),href:"/security"})}{contextLink({label:nav("support"),href:"/support"})}
              <details className={styles.group}><summary>{u("legal")}<ChevronDown size={15}/></summary>{FOOTER_COLUMNS[3].items.map(item => contextLink({label:footer(item.labelKey),href:item.href}))}</details>
            </>}
            {contextual && section === "settings" && <div className={styles.contextExtras}>{contextLink({label:t("apiKeys"),href:"/dashboard/settings/api-keys"})}{contextLink({label:t("plans"),href:"/dashboard/billing"})}{user?.isAdmin && contextLink({label:"Admin",href:"/admin"})}</div>}
          </div>
          <div className={styles.sidebarFooter}>
            <div ref={setSettingsTarget} hidden={browsingAgents} />
            {!isAuthenticated ? <Link href={loginHrefForReturn(pathname)} className={styles.primary} onClick={closeSidebar}><LogIn size={16}/>{entry("signIn")}</Link> : <AiCreditStatus variant="drawer" onNavigate={closeSidebar} />}
            <div className={styles.utilities}><LocaleSwitcher align="start" side="top" /><ThemeToggle /><a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Hatcher on X" title="X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-7.4L5.6 22H2.4l8.2-9.4L.8 2h6.4l4.5 6.8L18.9 2ZM17.8 20h1.7L6.3 4H4.5l13.3 16Z"/></svg></a><a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Hatcher on Telegram" title="Telegram"><Send size={17}/></a>{isAuthenticated && <button className={styles.iconButton} onClick={() => void signOut()} aria-label={t("signOut")}><LogOut size={16}/></button>}</div>
            <div className={styles.storeLinks}>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <AppStoreIcon /><span><small>{mobile("ctaAppStoreKicker")}</small><strong>{mobile("ctaAppStore")}</strong></span>
              </a>
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
                <GooglePlayIcon /><span><small>{mobile("ctaPlayStoreKicker")}</small><strong>{mobile("ctaPlayStore")}</strong></span>
              </a>
            </div>
          </div>
        </aside>
      </div>
      <div className={styles.content} inert={mobileOpen && isMobile}>
        <header className={styles.header}>
          <button ref={toggleRef} className={`${styles.iconButton} ${styles.openSidebar}`} onClick={toggleSidebar} aria-label={isMobile ? u("openMenu") : t("toggleSidebar")} aria-controls="workspace-navigation" aria-expanded={isMobile ? mobileOpen : !collapsed}>{isMobile ? <Menu size={22}/> : <PanelLeftOpen size={19}/>}</button>
          {section === "chats" || section === "canvas" || agentId ? <div className={styles.headerSlot}><div ref={setHeaderTarget} className={styles.headerIdentity}/><div ref={setToolsTarget} className={styles.toolsTarget}/></div> : <div className={styles.breadcrumb}><span>Hatcher</span><ChevronRight size={14}/><strong>{label(section)}</strong></div>}
          <div className={styles.headerRight}>
            <div ref={setActionsTarget} className={styles.actionsTarget}/>
            {!agentId && isAuthenticated && <NotificationCenter/>}
            {!isAuthenticated && section !== "chats" && <Link href={loginHrefForReturn(pathname)} className={styles.signIn}>{entry("signIn")}</Link>}
          </div>
        </header>
        <main ref={mainRef} id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}
