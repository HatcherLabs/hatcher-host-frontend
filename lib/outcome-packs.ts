export const OUTCOME_PACK_IDS = [
  'market-pulse-v1',
  'trade-plan-review-v1',
  'portfolio-risk-review-v1',
  'research-report-v1',
  'competitor-watch-v1',
  'launch-content-v1',
  'pr-review-v1',
] as const;

export type FirstPartyOutcomePackId = (typeof OUTCOME_PACK_IDS)[number];

export const OUTCOME_PACK_COPY_SLUGS: Record<FirstPartyOutcomePackId, string> = {
  'market-pulse-v1': 'marketPulse',
  'trade-plan-review-v1': 'tradePlanReview',
  'portfolio-risk-review-v1': 'portfolioRiskReview',
  'research-report-v1': 'researchReport',
  'pr-review-v1': 'pullRequestReview',
  'competitor-watch-v1': 'competitorWatch',
  'launch-content-v1': 'launchContent',
};

export function outcomePackCopySlug(packId: string): string | null {
  return OUTCOME_PACK_COPY_SLUGS[packId as FirstPartyOutcomePackId] ?? null;
}

type UnknownRecord = Record<string, unknown>;

export type OutcomePackInputFieldType =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'select'
  | 'multi_select'
  | 'string_list';

export type OutcomePackDraftValue = string | string[];
export type OutcomePackDraftInputs = Record<string, OutcomePackDraftValue>;
export type OutcomePackSerializedInputs = Record<string, string | number | string[]>;

export interface OutcomePackInputFieldModel {
  key: string;
  label: string;
  type: OutcomePackInputFieldType;
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
  type: string | null;
  artifactKind: string | null;
  characters: number | null;
}

export interface OutcomePackScheduleModel {
  id: string;
  label: string;
  description: string | null;
  cron: string | null;
  timezone: string | null;
}

export interface OutcomePackRecurrenceDraft {
  enabled: boolean;
  consent: boolean;
  templateId: string;
  maxRuns: string;
  budgetAiCreditsPerRun: string;
}

export interface OutcomePackRecurrenceInput {
  consent: true;
  templateId: string;
  maxRuns: number;
  budgetAiCreditsPerRun: number;
}

export type OutcomePackRecurrenceError = 'consent_required' | 'limits_invalid' | null;

export function buildOutcomePackRecurrence(
  draft: OutcomePackRecurrenceDraft,
  schedules: OutcomePackScheduleModel[],
  budgetTargetAiCredits: number | null,
): { recurrence: OutcomePackRecurrenceInput | null; error: OutcomePackRecurrenceError } {
  if (!draft.enabled) return { recurrence: null, error: null };
  if (!draft.consent) return { recurrence: null, error: 'consent_required' };
  const maxRuns = Number(draft.maxRuns);
  const budgetAiCreditsPerRun = Number(draft.budgetAiCreditsPerRun);
  const templateExists = schedules.some((schedule) => schedule.id === draft.templateId);
  const validLimits = Number.isInteger(maxRuns)
    && maxRuns >= 1
    && maxRuns <= 30
    && Number.isInteger(budgetAiCreditsPerRun)
    && budgetAiCreditsPerRun >= 1
    && budgetTargetAiCredits !== null
    && budgetAiCreditsPerRun <= budgetTargetAiCredits;
  if (!templateExists || !validLimits) return { recurrence: null, error: 'limits_invalid' };
  return {
    recurrence: {
      consent: true,
      templateId: draft.templateId,
      maxRuns,
      budgetAiCreditsPerRun,
    },
    error: null,
  };
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
  reviewPolicy: { mode: 'manual_required' } | null;
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
  warnings: OutcomePackWarningModel[];
  resolvedTasks: PreparedOutcomePackTaskModel[];
  requiredSkills: string[];
  budgetTargetAiCredits: number | null;
  maxRuntimeSeconds: number | null;
  acceptanceChecks: OutcomePackDetailItemModel[];
  schedules: OutcomePackScheduleModel[];
  launchPolicy: unknown;
  reviewPolicy: { mode: 'manual_required' } | null;
}

export interface OutcomePackWarningModel {
  code: string;
  label: string;
  params: Record<string, string | number>;
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

function stringNumberRecord(value: unknown): Record<string, string | number> {
  const raw = record(value);
  return Object.fromEntries(Object.entries(raw).filter(
    (entry): entry is [string, string | number] => (
      typeof entry[1] === 'string' || (typeof entry[1] === 'number' && Number.isFinite(entry[1]))
    ),
  ));
}

function normalizeReviewPolicy(value: unknown): { mode: 'manual_required' } | null {
  const raw = record(value);
  return raw.mode === 'manual_required' ? { mode: 'manual_required' } : null;
}

function normalizeWarning(value: unknown, index: number): OutcomePackWarningModel {
  if (typeof value === 'string') {
    return { code: `legacy_warning_${index + 1}`, label: value, params: {} };
  }
  const raw = record(value);
  return {
    code: text(raw.code, `warning_${index + 1}`),
    label: text(raw.label, text(raw.message, 'Review this pack before launch.')),
    params: stringNumberRecord(raw.params),
  };
}

function normalizeInputField(value: unknown): OutcomePackInputFieldModel {
  const raw = record(value);
  const options = stringList(raw.options);
  const supportedTypes = new Set<OutcomePackInputFieldType>([
    'text',
    'textarea',
    'integer',
    'select',
    'multi_select',
    'string_list',
  ]);
  return {
    key: text(raw.key),
    label: text(raw.label, text(raw.key, 'Input')),
    type: typeof raw.type === 'string' && supportedTypes.has(raw.type as OutcomePackInputFieldType)
      ? raw.type as OutcomePackInputFieldType
      : 'text',
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
    return {
      id: `${prefix}-${index + 1}`,
      label: value,
      description: null,
      type: null,
      artifactKind: null,
      characters: null,
    };
  }
  const raw = record(value);
  const type = nullableText(raw.type);
  return {
    id: text(raw.id, type ?? `${prefix}-${index + 1}`),
    label: text(raw.title, text(raw.label, text(raw.name, type ?? `${prefix} ${index + 1}`))),
    description: nullableText(raw.description),
    type,
    artifactKind: nullableText(raw.artifactKind),
    characters: finiteNumber(raw.characters),
  };
}

export function normalizeOutcomePackAcceptanceChecks(value: unknown): OutcomePackDetailItemModel[] {
  return Array.isArray(value)
    ? value.map((item, index) => normalizeDetailItem(item, index, 'acceptance'))
    : [];
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
    acceptanceChecks: normalizeOutcomePackAcceptanceChecks(raw.acceptanceChecks),
    schedules: Array.isArray(raw.schedules) ? raw.schedules.map(normalizeSchedule) : [],
    launchPolicy: raw.launchPolicy ?? null,
    reviewPolicy: normalizeReviewPolicy(raw.reviewPolicy),
  };
}

export function normalizeOutcomePackList(value: unknown): OutcomePackModel[] {
  const raw = record(value);
  const packs = Array.isArray(raw.packs) ? raw.packs.map(normalizeOutcomePack) : [];
  const order = new Map<string, number>(OUTCOME_PACK_IDS.map((id, index) => [id, index]));
  return packs.sort((left, right) => {
    const leftOrder = order.get(left.id);
    const rightOrder = order.get(right.id);
    if (leftOrder !== undefined || rightOrder !== undefined) {
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) -
        (rightOrder ?? Number.MAX_SAFE_INTEGER);
    }
    return left.title.localeCompare(right.title);
  });
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
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(normalizeWarning) : [],
    resolvedTasks: Array.isArray(raw.resolvedTasks)
      ? raw.resolvedTasks.map(normalizePreparedTask)
      : [],
    requiredSkills: stringList(raw.requiredSkills),
    budgetTargetAiCredits: finiteNumber(raw.budgetTargetAiCredits),
    maxRuntimeSeconds: finiteNumber(raw.maxRuntimeSeconds),
    acceptanceChecks: normalizeOutcomePackAcceptanceChecks(raw.acceptanceChecks),
    schedules: Array.isArray(raw.schedules) ? raw.schedules.map(normalizeSchedule) : [],
    launchPolicy: raw.launchPolicy ?? null,
    reviewPolicy: normalizeReviewPolicy(raw.reviewPolicy),
  };
}

export type OutcomePackCopyTranslator = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>,
) => string;

export function localizeOutcomePackModel(
  value: OutcomePackModel,
  translate: OutcomePackCopyTranslator,
): OutcomePackModel {
  const slug = outcomePackCopySlug(value.id);
  if (!slug) return value;
  const base = `content.packs.${slug}`;
  return {
    ...value,
    title: translate(`${base}.title`, value.title),
    summary: translate(`${base}.summary`, value.summary),
    category: translate(`content.categories.${value.category}`, value.category),
    prerequisites: value.prerequisites.map((item) => ({
      ...item,
      label: translate(`content.prerequisites.${item.id}`, item.label),
    })),
    inputFields: value.inputFields.map((field) => ({
      ...field,
      label: translate(`${base}.fields.${field.key}`, field.label),
    })),
    deliverables: value.deliverables.map((item) => ({
      ...item,
      label: translate(`${base}.deliverables.${item.id}`, item.label),
    })),
    acceptanceChecks: value.acceptanceChecks.map((item) => (
      item.type === 'manual'
        ? { ...item, label: translate(`${base}.manualAcceptance`, item.label) }
        : item
    )),
    schedules: value.schedules.map((schedule) => ({
      ...schedule,
      label: translate(`${base}.schedules.${schedule.id}`, schedule.label),
    })),
  };
}

export function localizeOutcomePackPreparationModel(
  value: OutcomePackPreparationModel,
  translate: OutcomePackCopyTranslator,
): OutcomePackPreparationModel {
  const slug = outcomePackCopySlug(value.pack.id);
  if (!slug) return value;
  const base = `content.packs.${slug}`;
  return {
    ...value,
    pack: { ...value.pack, title: translate(`${base}.title`, value.pack.title) },
    missingPrerequisites: value.missingPrerequisites.map((item) => ({
      ...item,
      label: translate(`content.prerequisites.${item.id}`, item.label),
    })),
    warnings: value.warnings.map((warning) => ({
      ...warning,
      label: translate(`content.warnings.${warning.code}`, warning.label, warning.params),
    })),
    resolvedTasks: value.resolvedTasks.map((task) => ({
      ...task,
      title: translate(`${base}.taskTitle`, task.title),
      description: task.description === null
        ? null
        : translate(`${base}.taskDescription`, task.description),
    })),
    acceptanceChecks: value.acceptanceChecks.map((item) => (
      item.type === 'manual'
        ? { ...item, label: translate(`${base}.manualAcceptance`, item.label) }
        : item
    )),
    schedules: value.schedules.map((schedule) => ({
      ...schedule,
      label: translate(`${base}.schedules.${schedule.id}`, schedule.label),
    })),
  };
}

export function validateOutcomePackInputs(
  fields: OutcomePackInputFieldModel[],
  inputs: OutcomePackDraftInputs,
): OutcomePackInputErrors {
  const errors: OutcomePackInputErrors = {};
  for (const field of fields) {
    const raw = inputs[field.key];
    const values = field.type === 'multi_select'
      ? (Array.isArray(raw) ? raw : [])
      : field.type === 'string_list'
        ? splitStringList(typeof raw === 'string' ? raw : '')
        : [];
    const value = typeof raw === 'string' ? raw.trim() : '';
    const empty = field.type === 'multi_select' || field.type === 'string_list'
      ? values.length === 0
      : value.length === 0;
    if (field.required && empty) errors[field.key] = 'required';
    if (field.maxLength !== null) {
      const tooLong = field.type === 'multi_select' || field.type === 'string_list'
        ? values.some((item) => item.length > field.maxLength!)
        : value.length > field.maxLength;
      if (tooLong) errors[field.key] = 'maxLength';
    }
    if (field.maxItems !== null && values.length > field.maxItems) errors[field.key] = 'maxItems';
    if (field.type === 'integer' && value && !/^-?\d+$/.test(value)) errors[field.key] = 'integer';
  }
  return errors;
}

function splitStringList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function initializeOutcomePackInputs(pack: OutcomePackModel): OutcomePackDraftInputs {
  return Object.fromEntries(pack.inputFields.map((field) => [
    field.key,
    field.type === 'multi_select' ? [] : '',
  ]));
}

export function serializeOutcomePackInputs(
  fields: OutcomePackInputFieldModel[],
  inputs: OutcomePackDraftInputs,
): OutcomePackSerializedInputs {
  const serialized: OutcomePackSerializedInputs = {};
  for (const field of fields) {
    const raw = inputs[field.key];
    if (field.type === 'multi_select') {
      const values = (Array.isArray(raw) ? raw : [])
        .map((item) => item.trim())
        .filter(Boolean);
      if (values.length > 0 || field.required) serialized[field.key] = values;
      continue;
    }

    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value && !field.required) continue;
    if (field.type === 'string_list') {
      serialized[field.key] = splitStringList(value);
    } else if (field.type === 'integer') {
      serialized[field.key] = Number(value);
    } else {
      serialized[field.key] = value;
    }
  }
  return serialized;
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
