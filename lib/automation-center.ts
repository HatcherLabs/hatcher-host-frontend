import type { Agent } from '@/lib/api';

export type AutomationKind = 'schedule' | 'webhook' | 'ironclaw';
export type AutomationStatus = 'active' | 'paused' | 'attention';

export interface AutomationItem {
  id: string;
  agentId: string;
  agentName: string;
  framework: string;
  name: string;
  instructions: string;
  kind: AutomationKind;
  triggerLabel: string;
  status: AutomationStatus;
  nextRun: string | null;
  lastRun: string | null;
  lastResult: string | null;
  manageable: boolean;
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function dateText(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function list(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) return value;
  const body = record(value);
  return Array.isArray(body[key]) ? body[key] as unknown[] : [];
}

export function normalizeFrameworkSchedules(agent: Agent, payload: unknown): AutomationItem[] {
  return list(payload, 'jobs').flatMap((raw) => {
    const job = record(raw);
    const id = text(job.id ?? job.jobId ?? job.job_id);
    if (!id) return [];
    return [{
      id,
      agentId: agent.id,
      agentName: agent.name,
      framework: agent.framework,
      name: text(job.name) ?? id,
      instructions: text(job.prompt) ?? '',
      kind: 'schedule' as const,
      triggerLabel: text(job.schedule) ?? 'Recurring schedule',
      status: job.status === 'paused' || job.enabled === false ? 'paused' as const : 'active' as const,
      nextRun: dateText(job.nextRun ?? job.next_run_at ?? job.nextRunAt),
      lastRun: dateText(job.lastRun ?? job.last_run_at ?? job.lastRunAt),
      lastResult: text(job.lastResult ?? job.last_status),
      manageable: true,
    }];
  });
}

export function normalizeIronClawAutomations(agent: Agent, payload: unknown): AutomationItem[] {
  return list(payload, 'automations').flatMap((raw) => {
    const automation = record(raw);
    const id = text(automation.automation_id ?? automation.id);
    if (!id) return [];
    const source = record(automation.source);
    const trigger = text(source.cron)
      ?? dateText(source.run_at)
      ?? text(automation.schedule_label)
      ?? text(source.type)
      ?? 'Managed schedule';
    const state = text(automation.state) ?? 'active';
    return [{
      id,
      agentId: agent.id,
      agentName: agent.name,
      framework: agent.framework,
      name: text(automation.display_name ?? automation.name) ?? id,
      instructions: text(automation.prompt ?? automation.description) ?? '',
      kind: 'ironclaw' as const,
      triggerLabel: trigger,
      status: state === 'paused' ? 'paused' as const : ['failed', 'error'].includes(state) ? 'attention' as const : 'active' as const,
      nextRun: dateText(automation.next_run_at),
      lastRun: dateText(automation.last_run_at),
      lastResult: text(automation.last_status),
      manageable: true,
    }];
  });
}

export function webhookAutomation(
  agent: Agent,
  payload: { url?: string; tokenConfigured?: boolean },
): AutomationItem | null {
  if (!payload.url) return null;
  return {
    id: `webhook:${agent.id}`,
    agentId: agent.id,
    agentName: agent.name,
    framework: agent.framework,
    name: 'Inbound webhook',
    instructions: 'Run this agent when an authenticated external request arrives.',
    kind: 'webhook',
    triggerLabel: 'External HTTP event',
    status: payload.tokenConfigured ? 'active' : 'attention',
    nextRun: null,
    lastRun: null,
    lastResult: payload.tokenConfigured ? 'Ready' : 'Restart agent to provision token',
    manageable: false,
  };
}

export function automationMatches(
  automation: AutomationItem,
  query: string,
  status: 'all' | AutomationStatus,
  kind: 'all' | AutomationKind,
  agentId: string,
): boolean {
  if (status !== 'all' && automation.status !== status) return false;
  if (kind !== 'all' && automation.kind !== kind) return false;
  if (agentId && automation.agentId !== agentId) return false;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [automation.name, automation.agentName, automation.triggerLabel, automation.instructions]
    .some((value) => value.toLowerCase().includes(normalized));
}
