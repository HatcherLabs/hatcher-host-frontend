import { describe, expect, it } from "vitest";
import {
  CAPACITY_ADDONS,
  countUnitsByKind,
  daysRemaining,
  findCapacityAddon,
  formatCapacity,
  formatMemoryMb,
  isCapacityAddonKey,
} from "../lib/capacity-addons";

describe("capacity add-on catalog", () => {
  it("ships exactly the three per-agent add-ons at the published prices", () => {
    expect(CAPACITY_ADDONS.map((a) => a.key)).toEqual([
      "addon.boost_s",
      "addon.boost_l",
      "addon.storage_plus",
    ]);
    expect(CAPACITY_ADDONS.map((a) => a.usdPrice)).toEqual([9, 19, 5]);
  });

  it("grants +1 vCPU/+1 GB for Boost S, +2 vCPU/+3 GB for Boost L, +10 GB workspace for Storage+", () => {
    const boostS = findCapacityAddon("addon.boost_s");
    const boostL = findCapacityAddon("addon.boost_l");
    const storage = findCapacityAddon("addon.storage_plus");
    expect(boostS).toMatchObject({ cpus: 1, memoryMb: 1024, storageMb: 0 });
    expect(boostL).toMatchObject({ cpus: 2, memoryMb: 3072, storageMb: 0 });
    expect(storage).toMatchObject({ cpus: 0, memoryMb: 0, storageMb: 10240 });
  });

  it("only boosts get a multi-unit quantity picker (1-5); Storage+ buys one unit per checkout", () => {
    expect(findCapacityAddon("addon.boost_s")?.maxQuantity).toBe(5);
    expect(findCapacityAddon("addon.boost_l")?.maxQuantity).toBe(5);
    expect(findCapacityAddon("addon.storage_plus")?.maxQuantity).toBe(1);
  });

  it("finds add-ons by bare kind as well as by full addon key", () => {
    expect(findCapacityAddon("boost_l")?.key).toBe("addon.boost_l");
    expect(findCapacityAddon("addon.storage_plus")?.kind).toBe("storage_plus");
    expect(findCapacityAddon("addon.agents.3")).toBeUndefined();
    expect(findCapacityAddon("")).toBeUndefined();
  });

  it("isCapacityAddonKey narrows only the three capacity keys", () => {
    expect(isCapacityAddonKey("addon.boost_s")).toBe(true);
    expect(isCapacityAddonKey("addon.boost_l")).toBe(true);
    expect(isCapacityAddonKey("addon.storage_plus")).toBe(true);
    expect(isCapacityAddonKey("addon.ai_credits.5000")).toBe(false);
    expect(isCapacityAddonKey("boost_s")).toBe(false);
  });
});

describe("formatMemoryMb", () => {
  it("keeps sub-GB values in MB", () => {
    expect(formatMemoryMb(0)).toBe("0 MB");
    expect(formatMemoryMb(512)).toBe("512 MB");
  });

  it("renders whole GB without decimals", () => {
    expect(formatMemoryMb(1024)).toBe("1 GB");
    expect(formatMemoryMb(3072)).toBe("3 GB");
    expect(formatMemoryMb(32768)).toBe("32 GB");
  });

  it("renders fractional GB with one decimal", () => {
    expect(formatMemoryMb(1536)).toBe("1.5 GB");
    expect(formatMemoryMb(2560)).toBe("2.5 GB");
  });
});

describe("formatCapacity", () => {
  it("composes vCPU and RAM into one label", () => {
    expect(formatCapacity({ cpus: 4, memoryMb: 6144 })).toBe("4 vCPU / 6 GB");
    expect(formatCapacity({ cpus: 1.5, memoryMb: 2048 })).toBe("1.5 vCPU / 2 GB");
    expect(formatCapacity({ cpus: 16, memoryMb: 32768 })).toBe("16 vCPU / 32 GB");
  });
});

describe("daysRemaining", () => {
  const now = new Date("2026-07-29T00:00:00.000Z");

  it("returns null for missing or unparseable dates", () => {
    expect(daysRemaining(null, now)).toBeNull();
    expect(daysRemaining(undefined, now)).toBeNull();
    expect(daysRemaining("not-a-date", now)).toBeNull();
  });

  it("counts partial days as a full day (ceil)", () => {
    expect(daysRemaining("2026-07-29T12:00:00.000Z", now)).toBe(1);
    expect(daysRemaining("2026-08-28T00:00:00.000Z", now)).toBe(30);
    expect(daysRemaining("2026-08-28T01:00:00.000Z", now)).toBe(31);
  });

  it("clamps expired units to 0 instead of going negative", () => {
    expect(daysRemaining("2026-07-01T00:00:00.000Z", now)).toBe(0);
    expect(daysRemaining("2026-07-29T00:00:00.000Z", now)).toBe(0);
  });
});

describe("countUnitsByKind", () => {
  it("groups units by kind in catalog order", () => {
    expect(countUnitsByKind([
      { kind: "storage_plus" },
      { kind: "boost_s" },
      { kind: "boost_s" },
    ])).toEqual([
      { kind: "boost_s", count: 2 },
      { kind: "storage_plus", count: 1 },
    ]);
  });

  it("accepts full addon keys as kinds and drops unknown kinds", () => {
    expect(countUnitsByKind([
      { kind: "addon.boost_l" },
      { kind: "addon.file_manager" },
      { kind: "mystery" },
    ])).toEqual([
      { kind: "boost_l", count: 1 },
    ]);
  });

  it("returns an empty list for no units", () => {
    expect(countUnitsByKind([])).toEqual([]);
  });
});
