import { describe, expect, it } from 'vitest';
import {
  createOutcomePackIdempotencyKey,
  isOutcomePackLaunchReady,
  normalizeOutcomePack,
  normalizeOutcomePackList,
  normalizeOutcomePackPreparation,
  outcomePackSetupTab,
  validateOutcomePackInputs,
} from '@/lib/outcome-packs';

describe('outcome packs', () => {
  it('normalizes and orders the four first-party packs', () => {
    const packs = normalizeOutcomePackList({
      packs: [
        { id: 'launch-content-v1', title: 'Launch content' },
        { id: 'unknown-pack', title: 'Unknown' },
        { id: 'research-report-v1', title: 'Research report' },
        { id: 'competitor-watch-v1', title: 'Competitor watch' },
        { id: 'pr-review-v1', title: 'PR review' },
      ],
    });

    expect(packs.map((pack) => pack.id)).toEqual([
      'research-report-v1',
      'pr-review-v1',
      'competitor-watch-v1',
      'launch-content-v1',
    ]);
  });

  it('normalizes the final public pack contract', () => {
    const pack = normalizeOutcomePack({
      id: 'research-report-v1',
      version: '1',
      title: 'Research report',
      summary: 'A cited decision brief.',
      category: 'Research',
      compatibleFrameworks: ['openclaw'],
      requiredSkills: ['web-search'],
      prerequisites: [{ id: 'mcp-search', label: 'Search connector' }],
      inputFields: [
        { key: 'topic', label: 'Topic', type: 'textarea', required: true, maxLength: 500 },
        { key: 'depth', label: 'Depth', type: 'text', required: true, options: ['brief', 'deep'] },
      ],
      deliverables: ['Source table', { id: 'report', title: 'Final report', description: 'Cited markdown.' }],
      budgetTargetAiCredits: 80,
      maxRuntimeSeconds: 1200,
      acceptanceChecks: ['Every material claim is cited'],
      schedules: [{ id: 'weekly', label: 'Weekly refresh', cron: '0 9 * * 1', timezone: 'UTC' }],
      launchPolicy: { requiresApproval: false },
    });

    expect(pack).toMatchObject({
      summary: 'A cited decision brief.',
      category: 'Research',
      requiredSkills: ['web-search'],
      budgetTargetAiCredits: 80,
      maxRuntimeSeconds: 1200,
    });
    expect(pack.inputFields[0]).toMatchObject({ key: 'topic', type: 'textarea', maxLength: 500 });
    expect(pack.inputFields[1]).toMatchObject({ key: 'depth', type: 'select', options: ['brief', 'deep'] });
    expect(pack.deliverables[1]).toMatchObject({ id: 'report', label: 'Final report' });
    expect(pack.acceptanceChecks[0].label).toBe('Every material claim is cited');
    expect(pack.schedules[0]).toMatchObject({ cron: '0 9 * * 1', timezone: 'UTC' });
  });

  it('normalizes the final preparation contract', () => {
    const preparation = normalizeOutcomePackPreparation({ preparation: {
      pack: { id: 'pr-review-v1', version: '1', title: 'PR review' },
      agent: { id: 'agent-1', name: 'Atlas', framework: 'openclaw', status: 'running' },
      compatible: false,
      missingPrerequisites: [{ id: 'github', label: 'GitHub repository' }],
      warnings: ['Budget is advisory.'],
      resolvedTasks: [{ id: 'review', title: 'Review PR', description: 'Inspect the diff.', prompt: 'Review PR 42.' }],
      requiredSkills: ['github'],
      budgetTargetAiCredits: 42,
      maxRuntimeSeconds: 900,
      acceptanceChecks: ['Every blocker references a file.'],
      schedules: [{ id: 'daily', label: 'Daily review', cron: '0 9 * * *', timezone: 'UTC' }],
      launchPolicy: { start: 'manual' },
    } });

    expect(preparation.pack.id).toBe('pr-review-v1');
    expect(preparation.agent?.name).toBe('Atlas');
    expect(preparation.missingPrerequisites[0]).toEqual({ id: 'github', label: 'GitHub repository' });
    expect(preparation.warnings).toEqual(['Budget is advisory.']);
    expect(preparation.resolvedTasks[0]).toMatchObject({ title: 'Review PR', prompt: 'Review PR 42.' });
    expect(preparation.budgetTargetAiCredits).toBe(42);
    expect(preparation.maxRuntimeSeconds).toBe(900);
    expect(isOutcomePackLaunchReady(preparation)).toBe(false);
    expect(isOutcomePackLaunchReady({ ...preparation, compatible: true, missingPrerequisites: [] })).toBe(true);
  });

  it('validates required values and maximum lengths by input key', () => {
    const errors = validateOutcomePackInputs([
      { key: 'topic', label: 'Topic', type: 'text', required: true, maxLength: 5, maxItems: null, options: [] },
      { key: 'notes', label: 'Notes', type: 'textarea', required: false, maxLength: null, maxItems: null, options: [] },
    ], { topic: 'too long', notes: '' });

    expect(errors).toEqual({ topic: 'maxLength' });
    expect(validateOutcomePackInputs([
      { key: 'topic', label: 'Topic', type: 'text', required: true, maxLength: 5, maxItems: null, options: [] },
    ], { topic: '  ' })).toEqual({ topic: 'required' });
  });

  it('routes prerequisites to the relevant agent setup tab', () => {
    expect(outcomePackSetupTab({ id: 'github', label: 'GitHub repository' })).toBe('dev');
    expect(outcomePackSetupTab({ id: 'web-search', label: 'Search connector' })).toBe('connectors');
    expect(outcomePackSetupTab({ id: 'telegram', label: 'Telegram channel' })).toBe('integrations');
  });

  it('creates a namespaced idempotency key per preparation attempt', () => {
    expect(createOutcomePackIdempotencyKey('attempt-1')).toBe('outcome-pack:attempt-1');
  });
});
