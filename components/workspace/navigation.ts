import { stripLocaleForChrome } from "@/components/layout/routeChrome";

export type WorkspaceSection =
  | "chats"
  | "canvas"
  | "agents"
  | "missions"
  | "approvals"
  | "analytics"
  | "plans"
  | "settings";

export function isWorkspacePath(pathname: string): boolean {
  const path = stripLocaleForChrome(pathname);
  return (
    (path === "/" || /^\/(dashboard(?:\/|$)|create(?:\/|$)|settings(?:\/|$))/.test(path)) &&
    !/^\/dashboard\/agent\/[^/]+\/desktop(?:\/|$)/.test(path)
  );
}

export function workspaceSection(
  pathname: string,
  _tab: string | null,
  mode?: string | null,
): WorkspaceSection {
  const path = stripLocaleForChrome(pathname);
  if (path === "/" || /^\/dashboard\/chats?(?:\/|$)/.test(path))
    return mode === "canvas" || mode === "studio" ? "canvas" : "chats";
  if (path.includes("/missions")) return "missions";
  if (path.includes("/approvals")) return "approvals";
  if (path.includes("/analytics")) return "analytics";
  if (path.includes("/billing")) return "plans";
  if (path.includes("/settings")) return "settings";
  return "agents";
}

export function workspaceAgentId(pathname: string): string | null {
  return (
    stripLocaleForChrome(pathname).match(
      /^\/dashboard\/agent\/([^/]+)$/,
    )?.[1] ?? null
  );
}

export function chatHref(agentId: string, sessionId?: string): string {
  const params = new URLSearchParams({ tab: "chat" });
  if (sessionId) params.set("session", sessionId);
  return `/dashboard/agent/${encodeURIComponent(agentId)}?${params}`;
}
