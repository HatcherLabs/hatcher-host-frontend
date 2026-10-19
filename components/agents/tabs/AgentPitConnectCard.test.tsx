// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
let root: Root;
function render(node: ReactNode) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => root.render(node));
}
const screen = {
  getByRole(role: string, filter?: { name: string }) {
    const selector =
      role === "button"
        ? "button"
        : role === "link"
          ? "a"
          : '[role="' + role + '"]';
    const el = [...document.querySelectorAll(selector)].find(
      (x) => !filter || x.textContent?.includes(filter.name),
    );
    if (!el) throw Error("Missing " + role);
    return el;
  },
};
const fireEvent = {
  click: (el: Element) =>
    el.dispatchEvent(new MouseEvent("click", { bubbles: true })),
};
function cleanup() {
  act(() => root?.unmount());
  document.body.innerHTML = "";
}
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
import { AgentPitConnectCard } from "./AgentPitConnectCard";
const mock = vi.hoisted(() => ({
  begin: vi.fn(),
  poll: vi.fn(),
  status: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  api: {
    getAgentPitConnection: mock.status,
    beginAgentPitConnect: mock.begin,
    pollAgentPitConnect: mock.poll,
  },
}));
beforeEach(() => {
  vi.resetAllMocks();
  mock.status.mockResolvedValue({
    success: true,
    data: { status: "not_connected" },
  });
  vi.useFakeTimers();
  vi.spyOn(window, "open").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("opens authorization then observes completion without starting trading", async () => {
  mock.begin.mockResolvedValue({
    success: true,
    data: {
      status: "authorization_required",
      verificationUrl:
        "https://supportive-banquet-05.authkit.app/device?user_code=CODE",
      userCode: "CODE",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      interval: 5,
    },
  });
  mock.poll.mockResolvedValue({
    success: true,
    data: { status: "connected", connectorId: "con" },
  });
  const done = vi.fn();
  render(
    <AgentPitConnectCard
      agentId="agent"
      connected={false}
      onConnected={done}
      onDiscuss={() => {}}
    />,
  );
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Connect AgentPit" }));
  });
  expect(
    screen
      .getByRole("link", { name: "Open AgentPit sign-in" })
      .getAttribute("href"),
  ).toContain("/device?user_code=CODE");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(done).toHaveBeenCalledOnce();
  expect(mock.poll).toHaveBeenCalledWith("agent");
});
it("rejects a non-provider sign-in URL", async () => {
  mock.begin.mockResolvedValue({
    success: true,
    data: {
      status: "authorization_required",
      verificationUrl: "https://evil.invalid/device",
      userCode: "CODE",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      interval: 5,
    },
  });
  render(
    <AgentPitConnectCard
      agentId="agent"
      connected={false}
      onConnected={() => {}}
      onDiscuss={() => {}}
    />,
  );
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Connect AgentPit" }));
  });
  expect(screen.getByRole("alert").textContent).toContain(
    "Unexpected sign-in address.",
  );
  expect(mock.poll).not.toHaveBeenCalled();
});
it("loads a verified portfolio and hands off to chat only on request", async () => {
  mock.status.mockResolvedValue({
    success: true,
    data: {
      status: "connected",
      account: {
        name: "PaperAgent",
        address: "0x1111111111111111111111111111111111111111",
        cashUsd: 100000,
        equityUsd: 100000,
      },
    },
  });
  const discuss = vi.fn();
  render(
    <AgentPitConnectCard
      agentId="agent"
      connected={true}
      onConnected={() => {}}
      onDiscuss={discuss}
    />,
  );
  await act(async () => {});
  expect(document.body.textContent).toContain("100,000");
  expect(document.body.textContent).toContain("PaperAgent");
  expect(mock.begin).not.toHaveBeenCalled();
  expect(discuss).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discuss strategy" }));
  });
  expect(discuss).toHaveBeenCalledOnce();
});
it("expires a pending sign-in and offers another connection", async () => {
  mock.begin.mockResolvedValue({
    success: true,
    data: {
      status: "authorization_required",
      verificationUrl:
        "https://supportive-banquet-05.authkit.app/device?user_code=CODE",
      userCode: "CODE",
      expiresAt: new Date(Date.now() + 4000).toISOString(),
      interval: 5,
    },
  });
  render(
    <AgentPitConnectCard
      agentId="agent"
      connected={false}
      onConnected={() => {}}
      onDiscuss={() => {}}
    />,
  );
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Connect AgentPit" }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(screen.getByRole("alert").textContent).toContain("expired");
  expect(
    screen
      .getByRole("button", { name: "Connect AgentPit" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
it("shows provider denial without claiming connection", async () => {
  mock.begin.mockResolvedValue({
    success: false,
    error: "AgentPit authorization was declined.",
  });
  render(
    <AgentPitConnectCard
      agentId="agent"
      connected={false}
      onConnected={() => {}}
      onDiscuss={() => {}}
    />,
  );
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Connect AgentPit" }));
  });
  expect(screen.getByRole("alert").textContent).toContain("declined");
  expect(mock.poll).not.toHaveBeenCalled();
});

it("supports browser sign-in without a device code and displays callback failure", async () => {
  mock.begin.mockResolvedValue({
    success: true,
    data: {
      status: "authorization_required",
      verificationUrl:
        "https://supportive-banquet-05.authkit.app/oauth2/authorize?state=example",
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      interval: 5,
    },
  });
  mock.poll.mockResolvedValue({
    success: true,
    data: {
      status: "failed",
      error: "AgentPit did not approve sign-in. Connect again.",
    },
  });
  const done = vi.fn();
  render(
    <AgentPitConnectCard
      agentId="agent"
      connected={false}
      onConnected={done}
      onDiscuss={() => {}}
    />,
  );
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Connect AgentPit" }));
  });
  expect(
    screen
      .getByRole("link", { name: "Open AgentPit sign-in" })
      .getAttribute("href"),
  ).toContain("/oauth2/authorize");
  expect(document.body.textContent).toContain("existing AgentPit email");
  expect(document.body.textContent).not.toContain("confirm this code");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(screen.getByRole("alert").textContent).toContain("did not approve");
  expect(
    screen
      .getByRole("button", { name: "Connect AgentPit" })
      .hasAttribute("disabled"),
  ).toBe(false);
  expect(done).not.toHaveBeenCalled();
});
