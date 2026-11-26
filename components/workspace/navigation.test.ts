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
    expect(isWorkspacePath("/pricing")).toBe(true);
    expect(isWorkspacePath("/ro/dashboard/agent/abc/desktop")).toBe(false);
    expect(isWorkspacePath("/platform")).toBe(true);
    expect(isWorkspacePath("/ro/features")).toBe(true);
    expect(isWorkspacePath("/privacy")).toBe(true);
    expect(isWorkspacePath("/embed/agent/abc")).toBe(false);
    expect(isWorkspacePath("/oauth/authorize")).toBe(false);
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
    expect(workspaceSection("/platform", null)).toBe("website");
    expect(workspaceSection("/explore", null)).toBe("discover");
    expect(workspaceSection("/support", null)).toBe("help");
    expect(workspaceSection("/pricing", null)).toBe("plans");
  });
  it("preserves session identifiers in chat deep links", () => {
    const href = chatHref("agent-1", "session/a?b=2");
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/dashboard/agent/agent-1");
    expect(url.searchParams.get("tab")).toBe("chat");
    expect(url.searchParams.get("session")).toBe("session/a?b=2");
  });
});
