import { describe, expect, it } from "vitest";
import { planSelection } from "@/lib/plan-selection";
const order = ["free", "starter", "pro", "business", "founding_member"];
describe("Existing paid plan selection", () => {
  it("keeps Founding lifetime benefits without another purchase", () => {
    expect(planSelection("founding_member", "founding_member", order)).toBe(
      "lifetime",
    );
    expect(planSelection("founding_member", "starter", order)).toBe("included");
  });
  it("distinguishes a renewal from an upgrade and blocks lower-tier purchases", () => {
    expect(planSelection("starter", "starter", order)).toBe("renew");
    expect(planSelection("starter", "pro", order)).toBe("upgrade");
    expect(planSelection("pro", "starter", order)).toBe("included");
  });
  it("requires billing review if current entitlement could not be loaded", () => {
    expect(planSelection(undefined, "starter", order)).toBe("manage");
    expect(planSelection("banned", "starter", order)).toBe("manage");
  });
});
