export const OUTCOME_PACK_IDS = [
  'research-report-v1',
  'pr-review-v1',
  'competitor-watch-v1',
  'launch-content-v1',
] as const;

export type FirstPartyOutcomePackId = (typeof OUTCOME_PACK_IDS)[number];

type UnknownRecord = Record<string, unknown>;

export interface OutcomePackInputFieldModel {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  maxLength: number | null;
  maxItems: number | null;
  options: string[];
}

export interface OutcomePackPrerequisiteModel {
  id: string;
  label: string;
}

export interface OutcomePackDetailItemModel {
  id: string;
  label: string;
  description: string | null;
}

export interface OutcomePackScheduleModel {
  id: string;
  label: string;
  description: string | null;
  cron: string | null;
  timezone: string | null;
}

export interface OutcomePackModel {
  id: string;
  version: string;
  title: string;
  summary: string;
  category: string;
  compatibleFrameworks: string[];
  requiredSkills: string[];
  prerequisites: OutcomePackPrerequisiteModel[];
  inputFields: OutcomePackInputFieldModel[];
  deliverables: OutcomePackDetailItemModel[];
  budgetTargetAiCredits: number | null;
  maxRuntimeSeconds: number | null;
  acceptanceChecks: OutcomePackDetailItemModel[];
  schedules: OutcomePackScheduleModel[];
  launchPolicy: unknown;
}

export interface PreparedOutcomePackTaskModel {
  id: string;
  title: string;
  description: string | null;
  prompt: string;
}

export interface OutcomePackPreparationModel {
  pack: { id: string; version: string; title: string };
  agent: { id: string; name: string; framework: string; status: string } | null;
  compatible: boolean;
  missingPrerequisites: OutcomePackPrerequisiteModel[];
  warnings: string[];
  resolvedTasks: PreparedOutcomePackTaskModel[];
  requiredSkills: string[];
  budgetTargetAiCredits: number | null;
  maxRuntimeSeconds: number | null;
  acceptanceChecks: OutcomePackDetailItemModel[];
  schedules: OutcomePackScheduleModel[];
  launchPolicy: unknown;
}

export interface OutcomePackInputErrors {
  [fieldKey: string]: string;
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
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function normalizeInputField(value: unknown): OutcomePackInputFieldModel {
  const raw = record(value);
  const options = stringList(raw.options);
  return {
    key: text(raw.key),
    label: text(raw.label, text(raw.key, 'Input')),
    type: raw.type === 'textarea' ? 'textarea' : options.length > 0 ? 'select' : 'text',
    required: raw.required === true,
    maxLength: finiteNumber(raw.maxLength),
    maxItems: finiteNumber(raw.maxItems),
    options,
  };
}

function normalizePrerequisite(value: unknown, index: number): OutcomePackPrerequisiteModel {
  const raw = record(value);
  return {
    id: text(raw.id, `prerequisite-${index + 1}`),
    label: text(raw.label, text(raw.id, 'Required setup')),
  };
}

function normalizeDetailItem(
  value: unknown,
  index: number,
  prefix: string,
): OutcomePackDetailItemModel {
  if (typeof value === 'string') {
    return { id: `${prefix}-${index + 1}`, label: value, description: null };
  }
  const raw = record(value);
  return {
    id: text(raw.id, `${prefix}-${index + 1}`),
    label: text(raw.title, text(raw.label, text(raw.name, `${prefix} ${index + 1}`))),
    description: nullableText(raw.description),
  };
}

function normalizeSchedule(value: unknown, index: number): OutcomePackScheduleModel {
  if (typeof value === 'string') {
    return {
      id: `schedule-${index + 1}`,
      label: value,
      description: null,
      cron: null,
      timezone: null,
    };
  }
  const raw = record(value);
  return {
    id: text(raw.id, `schedule-${index + 1}`),
    label: text(raw.label, text(raw.name, `Schedule ${index + 1}`)),
    description: nullableText(raw.description),
    cron: nullableText(raw.cron ?? raw.expression),
    timezone: nullableText(raw.timezone),
  };
}

export function normalizeOutcomePack(value: unknown): OutcomePackModel {
  const raw = record(value);
  return {
    id: text(raw.id),
    version: text(raw.version, '1'),
    title: text(raw.title, 'Outcome Pack'),
    summary: text(raw.summary),
    category: text(raw.category, 'Curated recipe'),
    compatibleFrameworks: stringList(raw.compatibleFrameworks),
    requiredSkills: stringList(raw.requiredSkills),
    prerequisites: Array.isArray(raw.prerequisites)
      ? raw.prerequisites.map(normalizePrerequisite)
      : [],
    inputFields: Array.isArray(raw.inputFields) ? raw.inputFields.map(normalizeInputField) : [],
    deliverables: Array.isArray(raw.deliverables)
      ? raw.deliverables.map((item, index) => normalizeDetailItem(item, index, 'deliverable'))
      : [],
    budgetTargetAiCredits: finiteNumber(raw.budgetTargetAiCredits),
    maxRuntimeSeconds: finiteNumber(raw.maxRuntimeSeconds),
    acceptanceChecks: Array.isArray(raw.acceptanceChecks)
      ? raw.acceptanceChecks.map((item, index) => normalizeDetailItem(item, index, 'acceptance'))
      : [],
    schedules: Array.isArray(raw.schedules) ? raw.schedules.map(normalizeSchedule) : [],
    launchPolicy: raw.launchPolicy ?? null,
  };
}

export function normalizeOutcomePackList(value: unknown): OutcomePackModel[] {
  const raw = record(value);
  const packs = Array.isArray(raw.packs) ? raw.packs.map(normalizeOutcomePack) : [];
  const order = new Map<string, number>(OUTCOME_PACK_IDS.map((id, index) => [id, index]));
  return packs
    .filter((pack) => order.has(pack.id))
    .sort((left, right) => (order.get(left.id) ?? 99) - (order.get(right.id) ?? 99));
}

function normalizePreparedTask(value: unknown, index: number): PreparedOutcomePackTaskModel {
  const raw = record(value);
  return {
    id: text(raw.id, `task-${index + 1}`),
    title: text(raw.title, `Task ${index + 1}`),
    description: nullableText(raw.description),
    prompt: text(raw.prompt),
  };
}

export function normalizeOutcomePackPreparation(value: unknown): OutcomePackPreparationModel {
  const container = record(value);
  const raw = 'preparation' in container ? record(container.preparation) : container;
  const rawPack = record(raw.pack);
  const rawAgent = record(raw.agent);
  return {
    pack: {
      id: text(rawPack.id),
      version: text(rawPack.version),
      title: text(rawPack.title),
    },
    agent: text(rawAgent.id) ? {
      id: text(rawAgent.id),
      name: text(rawAgent.name, 'Agent'),
      framework: text(rawAgent.framework),
      status: text(rawAgent.status),
    } : null,
    compatible: raw.compatible === true,
    missingPrerequisites: Array.isArray(raw.missingPrerequisites)
      ? raw.missingPrerequisites.map(normalizePrerequisite)
      : [],
    warnings: stringList(raw.warnings),
    resolvedTasks: Array.isArray(raw.resolvedTasks)
      ? raw.resolvedTasks.map(normalizePreparedTask)
      : [],
    requiredSkills: stringList(raw.requiredSkills),
    budgetTargetAiCredits: finiteNumber(raw.budgetTargetAiCredits),
    maxRuntimeSeconds: finiteNumber(raw.maxRuntimeSeconds),
    acceptanceChecks: Array.isArray(raw.acceptanceChecks)
      ? raw.acceptanceChecks.map((item, index) => normalizeDetailItem(item, index, 'acceptance'))
      : [],
    schedules: Array.isArray(raw.schedules) ? raw.schedules.map(normalizeSchedule) : [],
    launchPolicy: raw.launchPolicy ?? null,
  };
}

export function validateOutcomePackInputs(
  fields: OutcomePackInputFieldModel[],
  inputs: Record<string, string>,
): OutcomePackInputErrors {
  const errors: OutcomePackInputErrors = {};
  for (const field of fields) {
    if (field.required && !inputs[field.key]?.trim()) errors[field.key] = 'required';
    const value = inputs[field.key]?.trim() ?? '';
    if (field.maxLength !== null && value.length > field.maxLength) errors[field.key] = 'maxLength';
  }
  return errors;
}

export function isOutcomePackLaunchReady(preparation: OutcomePackPreparationModel | null): boolean {
  return Boolean(preparation?.compatible && preparation.missingPrerequisites.length === 0);
}

export function outcomePackSetupTab(
  prerequisite: OutcomePackPrerequisiteModel,
): 'connectors' | 'dev' | 'integrations' {
  const searchable = `${prerequisite.id} ${prerequisite.label}`.toLowerCase();
  if (/github|repository|repo|developer|code|pull request|pr review/.test(searchable)) return 'dev';
  if (/mcp|connector|browser|search|scrape/.test(searchable)) return 'connectors';
  return 'integrations';
}

export function createOutcomePackIdempotencyKey(entropy?: string): string {
  const generated = entropy ?? globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `outcome-pack:${generated}`;
}
