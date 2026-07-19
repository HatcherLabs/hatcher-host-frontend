import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AdminHealthResponse } from "@/lib/api";
import RuntimeReliabilityPanel, { runtimeHealthTone } from "./RuntimeReliabilityPanel";

const runtime: AdminHealthResponse["runtimeReleases"]["runtimes"][number] = {
  framework: "openclaw",
  currentVersion: "2026.7.1",
  currentSourceRef: "2026.7.1",
  latestVersion: "2026.7.1",
  latestSourceRef: "v2026.7.1",
  releaseUrl: "https://example.test/release",
  updateAvailable: false,
  imageId: "abc123",
  imageCreatedAt: "2026-07-19T00:00:00Z",
  containers: { total: 15, current: 15, stale: 0 },
};

describe("RuntimeReliabilityPanel", () => {
  it("distinguishes healthy, stale, and unknown release state", () => {
    expect(runtimeHealthTone(runtime)).toBe("healthy");
    expect(runtimeHealthTone({ ...runtime, containers: { total: 15, current: 14, stale: 1 } })).toBe("warning");
    expect(runtimeHealthTone({ ...runtime, updateAvailable: null })).toBe("unknown");
  });

  it("renders runtime adoption, synthetic probes, and durable email state", () => {
    const html = renderToStaticMarkup(
      <RuntimeReliabilityPanel
        runtimeReleases={{ checkedAt: "2026-07-19T00:00:00Z", latestCheckError: null, runtimes: [runtime] }}
        externalServices={{
          status: "degraded",
          checkedAt: "2026-07-19T00:00:00Z",
          probes: [{ name: "stripe", status: "unhealthy", latencyMs: 245, checkedAt: "2026-07-19T00:00:00Z", error: "Stripe returned 503" }],
        }}
        emailOutbox={{ pending: 2, processing: 1, sent: 40, deadLetter: 1, oldestPendingAt: null }}
      />,
    );

    expect(html).toContain("Runtime reliability");
    expect(html).toContain("15 / 15");
    expect(html).toContain("Stripe returned 503");
    expect(html).toContain("Dead letter");
  });
});
