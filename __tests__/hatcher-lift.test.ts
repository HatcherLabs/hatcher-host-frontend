import { describe, expect, it } from "vitest";
import type { LiftReviewCandidate } from "../lib/api/types";
import {
  LIFT_MAX_ARCHIVE_BYTES,
  buildLiftCommitBody,
  defaultLiftCandidateIds,
  isValidLiftAgentName,
  normalizeLiftAgentName,
  selectedEligibleLiftCandidateIds,
  validateLiftArchive,
} from "../lib/hatcher-lift";

const candidates: LiftReviewCandidate[] = [
  {
    id: "profile",
    sourcePath: "config.json",
    kind: "profile",
    targetPath: "profile",
    sizeBytes: 120,
    eligible: true,
  },
  {
    id: "memory",
    sourcePath: "memory/notes.md",
    kind: "memory",
    targetPath: "memory/notes.md",
    sizeBytes: 240,
    eligible: true,
  },
  {
    id: "skill",
    sourcePath: "skills/research/SKILL.md",
    kind: "skill",
    targetPath: "skills/research/SKILL.md",
    sizeBytes: 360,
    eligible: true,
  },
  {
    id: "blocked",
    sourcePath: ".env",
    kind: "memory",
    targetPath: "memory/env.txt",
    sizeBytes: 80,
    eligible: false,
    blockedReason: "secrets_detected",
  },
];

describe("Hatcher Lift client model", () => {
  it("accepts only non-empty ZIP archives up to 25 MB", () => {
    expect(validateLiftArchive({ name: "agent.zip", size: 1 })).toBeNull();
    expect(validateLiftArchive({ name: "AGENT.ZIP", size: LIFT_MAX_ARCHIVE_BYTES })).toBeNull();
    expect(validateLiftArchive({ name: "agent.tar", size: 1 })).toBe("not_zip");
    expect(validateLiftArchive({ name: "agent.zip", size: 0 })).toBe("empty");
    expect(validateLiftArchive({ name: "agent.zip", size: LIFT_MAX_ARCHIVE_BYTES + 1 })).toBe("too_large");
  });

  it("defaults profile and memory on, custom skills off, and never selects blocked entries", () => {
    expect(defaultLiftCandidateIds(candidates)).toEqual(["profile", "memory"]);
    expect(selectedEligibleLiftCandidateIds(candidates, ["skill", "blocked"])).toEqual(["skill"]);
  });

  it("builds a commit from eligible explicit selections only", () => {
    expect(buildLiftCommitBody({
      candidates,
      selectedIds: ["profile", "blocked"],
      name: "  Research Agent  ",
      description: "   ",
    })).toEqual({
      approvedCandidateIds: ["profile"],
      name: "Research Agent",
      description: null,
    });
  });

  it("normalizes an imported display name without preserving unsafe characters", () => {
    expect(normalizeLiftAgentName("  My \u{1F916} Agent  ", "openclaw")).toBe("My Agent");
    expect(normalizeLiftAgentName("x", "hermes")).toBe("Imported Hermes agent");
    expect(isValidLiftAgentName("Research Agent")).toBe(true);
    expect(isValidLiftAgentName("no/slashes")).toBe(false);
  });
});
