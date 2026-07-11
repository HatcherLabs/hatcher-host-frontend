import { describe, expect, it } from "vitest";
import { mergeMessageFallbacks } from "../i18n/messageFallback";

describe("localized message fallbacks", () => {
  it("keeps translated leaves and fills newly added English keys", () => {
    expect(mergeMessageFallbacks(
      {
        dashboard: {
          agents: { heading: "My agents" },
          lift: { title: "Import an agent", security: { title: "Secrets" } },
        },
      },
      {
        dashboard: {
          agents: { heading: "Meine Agenten" },
        },
      },
    )).toEqual({
      dashboard: {
        agents: { heading: "Meine Agenten" },
        lift: { title: "Import an agent", security: { title: "Secrets" } },
      },
    });
  });
});
