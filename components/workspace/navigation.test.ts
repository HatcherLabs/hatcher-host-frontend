import { describe, expect, it } from "vitest";
import {
  chatHref,
  isWorkspacePath,
  workspaceAgentId,
  workspaceSection,
} from "./navigation";

describe("workspace navigation", () => {
  it("keeps localized workspace routes inside the shell and immersive desktops outside it", () => {
    expect(isWorkspacePath("/ro/dashboard/agents")).toBe(true);
    expect(isWorkspacePath("/create")).toBe(true);
    expect(isWorkspacePath("/settings")).toBe(true);
    expect(isWorkspacePath("/pricing")).toBe(false);
    expect(isWorkspacePath("/ro/dashboard/agent/abc/desktop")).toBe(false);
    expect(isWorkspacePath("/dashboard-other")).toBe(false);
  });
  it("keeps Web Chat separate from agent conversations", () => {
    expect(workspaceSection("/ro/dashboard/agent/abc", "chat")).toBe("agents");
    expect(workspaceSection("/dashboard/chat", null)).toBe("chats");
    expect(workspaceSection("/dashboard/chat", null, "canvas")).toBe("canvas");
    expect(workspaceSection("/ro/dashboard/chats", null)).toBe("chats");
    expect(workspaceSection("/dashboard/agent/abc", "logs")).toBe("agents");
    expect(workspaceSection("/dashboard/agents", "chat")).toBe("agents");
    expect(workspaceSection("/dashboard/billing", null)).toBe("plans");
    expect(workspaceSection("/dashboard/settings/api-keys", null)).toBe(
      "settings",
    );
    expect(workspaceAgentId("/ro/dashboard/agent/abc")).toBe("abc");
    expect(workspaceAgentId("/dashboard/agents/new")).toBe(null);
  });
  it("preserves session identifiers in chat deep links", () => {
    const href = chatHref("agent-1", "session/a?b=2");
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/dashboard/agent/agent-1");
    expect(url.searchParams.get("tab")).toBe("chat");
    expect(url.searchParams.get("session")).toBe("session/a?b=2");
  });
});
