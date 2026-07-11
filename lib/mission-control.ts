import type {
  MissionApprovalStatus,
  MissionRunStatus,
  MissionTask,
  MissionTaskApproval,
  MissionTaskArtifact,
  MissionTaskRun,
  MissionTaskStatus,
  MissionTaskSummary,
} from '@/lib/api/types';

export const MISSION_CONTROL_ROUTE = '/dashboard/missions';

export const MISSION_TASK_STATUSES: MissionTaskStatus[] = [
  'pending_approval',
  'ready',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'rejected',
];

const TASK_STATUS_SET = new Set<string>(MISSION_TASK_STATUSES);
const RUN_STATUS_SET = new Set<string>(['queued', 'running', 'completed', 'failed', 'cancelled']);
const APPROVAL_STATUS_SET = new Set<string>(['pending', 'approved', 'rejected']);

type UnknownRecord = Record<string, unknown>;

export interface MissionTaskListModel {
  tasks: MissionTask[];
  nextCursor: string | null;
  summary: MissionTaskSummary;
}

export interface MissionTaskProgress {
  value: number | null;
  message: string | null;
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function timestamp(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : new Date(0).toISOString();
}

function taskStatus(value: unknown): MissionTaskStatus {
  return typeof value === 'string' && TASK_STATUS_SET.has(value)
    ? value as MissionTaskStatus
    : 'ready';
}

function runStatus(value: unknown): MissionRunStatus {
  return typeof value === 'string' && RUN_STATUS_SET.has(value)
    ? value as MissionRunStatus
    : 'queued';
}

function approvalStatus(value: unknown): MissionApprovalStatus {
  return typeof value === 'string' && APPROVAL_STATUS_SET.has(value)
    ? value as MissionApprovalStatus
    : 'pending';
}

function normalizeRun(value: unknown): MissionTaskRun | null {
  if (!value) return null;
  const raw = record(value);
  const events = Array.isArray(raw.events)
    ? raw.events.map((event) => ({ ...record(event) }))
    : undefined;
  return {
    id: text(raw.id),
    attempt: finiteNumber(raw.attempt) ?? 1,
    status: runStatus(raw.status),
    output: raw.output ?? null,
    error: nullableText(raw.error),
    costAiCredits: finiteNumber(raw.costAiCredits),
    claimedAt: nullableText(raw.claimedAt),
    startedAt: nullableText(raw.startedAt),
    finishedAt: nullableText(raw.finishedAt),
    cancelRequestedAt: nullableText(raw.cancelRequestedAt),
    createdAt: timestamp(raw.createdAt),
    events,
  };
}

function normalizeApproval(value: unknown): MissionTaskApproval {
  const raw = record(value);
  return {
    id: text(raw.id),
    status: approvalStatus(raw.status),
    note: nullableText(raw.note),
    requestedAt: timestamp(raw.requestedAt),
    decidedAt: nullableText(raw.decidedAt),
    decidedById: nullableText(raw.decidedById),
  };
}

function normalizeArtifact(value: unknown): MissionTaskArtifact {
  const raw = record(value);
  return {
    id: text(raw.id),
    runId: text(raw.runId),
    kind: text(raw.kind, 'output'),
    name: text(raw.name, 'Artifact'),
    mediaType: nullableText(raw.mediaType),
    url: nullableText(raw.url),
    path: nullableText(raw.path),
    content: raw.content ?? null,
    createdAt: timestamp(raw.createdAt),
  };
}

export function normalizeMissionTask(value: unknown): MissionTask {
  const raw = record(value);
  const agent = record(raw.agent);
  const budget = record(raw.budget);
  const cost = record(raw.cost);
  const normalizedAgent = text(agent.id)
    ? {
        id: text(agent.id),
        name: text(agent.name, 'Agent'),
        framework: text(agent.framework, 'openclaw') as NonNullable<MissionTask['agent']>['framework'],
        status: text(agent.status, 'unknown'),
      }
    : undefined;

  return {
    id: text(raw.id),
    agentId: text(raw.agentId, text(agent.id)),
    agent: normalizedAgent,
    title: text(raw.title, 'Untitled task'),
    description: nullableText(raw.description),
    prompt: text(raw.prompt),
    status: taskStatus(raw.status),
    source: text(raw.source, 'manual'),
    requiresApproval: raw.requiresApproval === true,
    budget: {
      aiCredits: finiteNumber(budget.aiCredits),
      maxRuntimeSeconds: finiteNumber(budget.maxRuntimeSeconds),
    },
    cost: {
      status: cost.status === 'measured' ? 'measured' : 'not_measured',
      aiCredits: finiteNumber(cost.aiCredits),
    },
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt ?? raw.createdAt),
    latestRun: normalizeRun(raw.latestRun),
    approvals: Array.isArray(raw.approvals) ? raw.approvals.map(normalizeApproval) : [],
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts.map(normalizeArtifact) : [],
  };
}

export function summarizeMissionTasks(tasks: MissionTask[]): MissionTaskSummary {
  const byStatus: Partial<Record<MissionTaskStatus, number>> = {};
  for (const task of tasks) byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
  return {
    total: tasks.length,
    active: (byStatus.queued ?? 0) + (byStatus.running ?? 0),
    awaitingApproval: byStatus.pending_approval ?? 0,
    completed: byStatus.completed ?? 0,
    failed: byStatus.failed ?? 0,
    cancelled: byStatus.cancelled ?? 0,
    byStatus,
  };
}

export function normalizeMissionTaskList(value: unknown): MissionTaskListModel {
  const raw = record(value);
  const tasks = Array.isArray(raw.tasks) ? raw.tasks.map(normalizeMissionTask) : [];
  const fallback = summarizeMissionTasks(tasks);
  const summary = record(raw.summary);
  const rawByStatus = record(summary.byStatus);
  const byStatus: Partial<Record<MissionTaskStatus, number>> = {};
  for (const status of MISSION_TASK_STATUSES) {
    const count = finiteNumber(rawByStatus[status]);
    if (count !== null) byStatus[status] = count;
  }
  const hasServerStatusCounts = Object.keys(byStatus).length > 0;
  const statusCount = (status: MissionTaskStatus) =>
    hasServerStatusCounts ? (byStatus[status] ?? 0) : (fallback.byStatus?.[status] ?? 0);
  const agents = Array.isArray(summary.agents)
    ? summary.agents.map((entry) => {
        const item = record(entry);
        return {
          agentId: text(item.agentId),
          name: text(item.name, 'Agent'),
          active: finiteNumber(item.active) ?? 0,
          needsAttention: finiteNumber(item.needsAttention) ?? 0,
        };
      })
    : undefined;
  return {
    tasks,
    nextCursor: nullableText(raw.nextCursor),
    summary: {
      total: finiteNumber(summary.total) ?? fallback.total,
      active: finiteNumber(summary.active) ?? statusCount('queued') + statusCount('running'),
      awaitingApproval:
        finiteNumber(summary.awaitingApproval) ??
        finiteNumber(summary.pendingApproval) ??
        statusCount('pending_approval'),
      completed: finiteNumber(summary.completed) ?? statusCount('completed'),
      failed: finiteNumber(summary.failed) ?? statusCount('failed'),
      cancelled: finiteNumber(summary.cancelled) ?? statusCount('cancelled'),
      needsAttention: finiteNumber(summary.needsAttention) ??
        statusCount('pending_approval') + statusCount('failed'),
      byStatus: hasServerStatusCounts ? byStatus : fallback.byStatus,
      agents,
    },
  };
}

export function missionTaskProgress(task: MissionTask): MissionTaskProgress {
  const events = task.latestRun?.events ?? [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = record(events[index]);
    const rawProgress = finiteNumber(event.progress);
    const value = rawProgress === null
      ? null
      : Math.max(0, Math.min(100, rawProgress <= 1 ? rawProgress * 100 : rawProgress));
    const message = nullableText(event.message);
    if (value !== null || message !== null) return { value, message };
  }
  return { value: task.status === 'completed' ? 100 : null, message: null };
}

export function missionOutputText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function safeMissionArtifactUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function canStartMissionTask(task: MissionTask): boolean {
  return task.status === 'ready';
}

export function canApproveMissionTask(task: MissionTask): boolean {
  return task.status === 'pending_approval';
}

export function canCancelMissionTask(task: MissionTask): boolean {
  return Boolean(
    task.latestRun?.id &&
    !task.latestRun.cancelRequestedAt &&
    (task.latestRun.status === 'queued' || task.latestRun.status === 'running'),
  );
}

export function canResumeMissionTask(task: MissionTask): boolean {
  return task.status === 'failed' || task.status === 'cancelled';
}
