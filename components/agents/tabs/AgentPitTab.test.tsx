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

import { AgentPitTab } from "./AgentPitTab";
const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  rename: vi.fn(),
  discuss: vi.fn(),
  strategy: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  api: {
    getAgentPitConnection: mocks.status,
    renameAgentPitAccount: mocks.rename,
    setAgentPitStrategy: mocks.strategy,
  },
}));
vi.mock("../AgentContext", () => ({
  useAgentContext: () => ({
    agent: { id: "agent-1" },
    openChatWithDraft: mocks.discuss,
  }),
}));
vi.mock("./AgentPitConnectCard", () => ({
  AgentPitConnectCard: () => <div>Connect AgentPit</div>,
}));
const connected = {
  status: "connected",
  account: {
    name: "KeenSignal",
    address: "0x1111111111111111111111111111111111111111",
    cashUsd: 100000,
    equityUsd: 100000,
  },
  portfolio: {
    positionsValueUsd: 0,
    pnlUsd: 0,
    trades: 0,
    returnPct: 0,
    rank: null,
    profileUrl: null,
    positions: [],
    openOrders: [],
    activity: [],
    positionsTotal: 0,
    openOrdersTotal: 0,
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.status.mockResolvedValue({ success: true, data: connected });
});
afterEach(() => cleanup());
it("renders verified cash and genuine empty activity without initiating trades", async () => {
  render(<AgentPitTab />);
  await act(async () => {});
  expect(document.body.textContent).toContain("KeenSignal");
  expect(document.body.textContent).toContain("100,000");
  expect(document.body.textContent).toContain("No fills or payouts yet");
  expect(document.body.textContent).toContain("0 filled trades");
  expect(mocks.discuss).not.toHaveBeenCalled();
  expect(mocks.rename).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discuss strategy" }));
  });
  expect(mocks.discuss).toHaveBeenCalledWith(
    expect.stringContaining("AGENTPIT_STRATEGY.md"),
  );
});
it("shows read errors instead of invented zero balances", async () => {
  mocks.status.mockResolvedValue({
    success: false,
    error: "Provider unavailable",
  });
  render(<AgentPitTab />);
  await act(async () => {});
  expect(screen.getByRole("alert").textContent).toContain(
    "Provider unavailable",
  );
  expect(document.body.textContent).not.toContain("100,000");
  expect(document.body.textContent).not.toContain("No fills");
});
it("pauses only on request and exposes the confirmed state", async () => {
  mocks.status.mockResolvedValue({success: true, data: {...connected, autopilot: {status: "active"}}});
  mocks.strategy.mockResolvedValue({success: true, data: {status: "paused"}});
  render(<AgentPitTab />);
  await act(async () => {});
  expect(mocks.strategy).not.toHaveBeenCalled();
  await act(async () => {fireEvent.click(screen.getByRole("button", {name: "Pause strategy"}));});
  expect(mocks.strategy).toHaveBeenCalledWith("agent-1", false);
  expect(screen.getByRole("button", {name: "Resume strategy"})).toBeTruthy();
  expect(screen.getByRole("link", {name: "Open AgentPit"}).getAttribute("href")).toBe("https://app.agentpit.dev");
});
it("renders activity as data and never links to an unsafe provider URL", async () => {
  mocks.status.mockResolvedValue({
    success: true,
    data: {
      ...connected,
      portfolio: {
        ...connected.portfolio,
        trades: 1,
        activity: [
          {
            title: "Market?",
            side: "buy",
            outcome: "Yes",
            shares: 100,
            valueUsd: 80,
            price: 0.8,
            sellUsd: null,
            timestamp: "2026-10-19T12:00:00Z",
            url: "javascript:alert(1)",
          },
        ],
      },
    },
  });
  render(<AgentPitTab />);
  await act(async () => {});
  expect(document.body.textContent).toContain("Market?");
  expect(document.body.textContent).toContain("buy · Yes · 100 shares");
  expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
});

it("shows the native cadence and owner-defined risk preferences", async () => {
  mocks.status.mockResolvedValue({success: true, data: {...connected, autopilot: {status: "active", schedule: "*/15 * * * *", maxTradeUsd: null}}});
  render(<AgentPitTab />); await act(async () => {});
  expect(document.body.textContent).toContain("Enabled · */15 * * * *");
  expect(document.body.textContent).toContain("Hatcher imposes no paper risk limits");
  expect(document.body.textContent).not.toContain("2,000 apUSD");
});
