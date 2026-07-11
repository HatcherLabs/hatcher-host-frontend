import type {
  CommitLiftImportBody,
  LiftFramework,
  LiftReviewCandidate,
} from "./api/types";

export const LIFT_MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const SAFE_LIFT_AGENT_NAME = /^[a-zA-Z0-9 \-:'.()&]+$/;

export type LiftArchiveValidationError = "not_zip" | "empty" | "too_large";

export interface LiftArchiveLike {
  name: string;
  size: number;
}

export function validateLiftArchive(
  file: LiftArchiveLike,
): LiftArchiveValidationError | null {
  if (!file.name.toLowerCase().endsWith(".zip")) return "not_zip";
  if (file.size === 0) return "empty";
  if (file.size > LIFT_MAX_ARCHIVE_BYTES) return "too_large";
  return null;
}

export function defaultLiftCandidateIds(
  candidates: LiftReviewCandidate[],
): string[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.eligible &&
        (candidate.kind === "profile" || candidate.kind === "memory"),
    )
    .map((candidate) => candidate.id);
}

export function selectedEligibleLiftCandidateIds(
  candidates: LiftReviewCandidate[],
  selectedIds: Iterable<string>,
): string[] {
  const selected = new Set(selectedIds);
  return candidates
    .filter((candidate) => candidate.eligible && selected.has(candidate.id))
    .map((candidate) => candidate.id);
}

export function normalizeLiftAgentName(
  importedName: string | undefined,
  framework: LiftFramework,
): string {
  const normalized = (importedName ?? "")
    .replace(/[^a-zA-Z0-9 \-:'.()&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);

  if (normalized.length >= 3) return normalized;
  return `Imported ${framework === "hermes" ? "Hermes" : "OpenClaw"} agent`;
}

export function isValidLiftAgentName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 50 && SAFE_LIFT_AGENT_NAME.test(trimmed);
}

export function buildLiftCommitBody({
  candidates,
  selectedIds,
  name,
  description,
}: {
  candidates: LiftReviewCandidate[];
  selectedIds: Iterable<string>;
  name: string;
  description: string;
}): CommitLiftImportBody {
  return {
    approvedCandidateIds: selectedEligibleLiftCandidateIds(candidates, selectedIds),
    name: name.trim(),
    description: description.trim() || null,
  };
}

export function formatLiftBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
