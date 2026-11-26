import { stripLocaleForChrome } from "@/components/layout/routeChrome";

export type WorkspaceSection =
  | "chats"
  | "canvas"
  | "agents"
  | "missions"
  | "approvals"
  | "analytics"
  | "plans"
  | "settings"
  | "discover"
  | "website"
  | "help"
  | "compute"
  | "mesh";

export function isWorkspacePath(pathname: string): boolean {
  const path = stripLocaleForChrome(pathname);
  return !/^\/(?:embed|demo|api|_next|og|skill|\.well-known)(?:\/|$)/.test(path)
    && !/^\/dashboard\/agent\/[^/]+\/desktop(?:\/|$)/.test(path)
    && path !== "/oauth/authorize";
}

export function workspaceSection(
  pathname: string,
  _tab: string | null,
  mode?: string | null,
): WorkspaceSection {
  const path = stripLocaleForChrome(pathname);
  if (path === "/" || /^\/dashboard\/chats?(?:\/|$)/.test(path))
    return mode === "canvas" || mode === "studio" ? "canvas" : "chats";
  if (/^\/(?:explore|traders|agent)(?:\/|$)/.test(path)) return "discover";
  if (/^\/(?:help|support)(?:\/|$)/.test(path)) return "help";
  if (path === "/dashboard/compute") return "compute";
  if (path === "/dashboard/mesh") return "mesh";
  if (path.includes("/missions") || path.includes("/automations")) return "missions";
  if (path.includes("/approvals")) return "approvals";
  if (path.includes("/analytics")) return "analytics";
  if (path.includes("/billing") || path === "/pricing") return "plans";
  if (path.includes("/settings")) return "settings";
  if (/^\/(?:dashboard|agents|create)(?:\/|$)/.test(path)) return "agents";
  return "website";
}

export function workspaceAgentId(pathname: string): string | null {
  return (
    stripLocaleForChrome(pathname).match(
      /^\/(?:dashboard\/agent|agents)\/([^/]+)$/,
    )?.[1] ?? null
  );
}

export function chatHref(agentId: string, sessionId?: string): string {
  const params = new URLSearchParams({ tab: "chat" });
  if (sessionId) params.set("session", sessionId);
  return `/dashboard/agent/${encodeURIComponent(agentId)}?${params}`;
}
