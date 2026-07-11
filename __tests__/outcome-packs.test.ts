import { describe, expect, it } from 'vitest';
import {
  createOutcomePackIdempotencyKey,
  initializeOutcomePackInputs,
  isOutcomePackLaunchReady,
  normalizeOutcomePack,
  normalizeOutcomePackList,
  normalizeOutcomePackPreparation,
  outcomePackSetupTab,
  serializeOutcomePackInputs,
  validateOutcomePackInputs,
  type OutcomePackDraftInputs,
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
        { key: 'depth', label: 'Depth', type: 'multi_select', required: true, options: ['brief', 'deep'] },
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
    expect(pack.inputFields[1]).toMatchObject({ key: 'depth', type: 'multi_select', options: ['brief', 'deep'] });
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

  it('preserves typed acceptance-check metadata instead of placeholder labels', () => {
    const pack = normalizeOutcomePack({
      id: 'research-report-v1',
      acceptanceChecks: [
        { type: 'all_tasks_completed' },
        { type: 'artifact_required', artifactKind: 'text' },
        { type: 'output_min_length', characters: 1_200 },
        { type: 'manual', label: 'Sources support the claims.' },
      ],
    });

    expect(pack.acceptanceChecks).toMatchObject([
      { id: 'all_tasks_completed', type: 'all_tasks_completed' },
      { id: 'artifact_required', type: 'artifact_required', artifactKind: 'text' },
      { id: 'output_min_length', type: 'output_min_length', characters: 1_200 },
      { id: 'manual', type: 'manual', label: 'Sources support the claims.' },
    ]);
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

  it('serializes the real input contract for every first-party pack', () => {
    const cases: Array<{
      fields: Array<Record<string, unknown>>;
      values: OutcomePackDraftInputs;
      expected: Record<string, unknown>;
    }> = [
      {
        fields: [
          { key: 'topic', label: 'Topic', type: 'textarea', required: true, maxLength: 500 },
          { key: 'questions', label: 'Questions', type: 'string_list', required: false, maxLength: 300, maxItems: 10 },
          { key: 'audience', label: 'Audience', type: 'text', required: false, maxLength: 300 },
          { key: 'outputLanguage', label: 'Language', type: 'text', required: false, maxLength: 64 },
        ],
        values: { topic: 'Agent operations', questions: 'What changed?\nWhy now?', audience: '', outputLanguage: '' },
        expected: { topic: 'Agent operations', questions: ['What changed?', 'Why now?'] },
      },
      {
        fields: [
          { key: 'repository', label: 'Repository', type: 'text', required: true, maxLength: 180 },
          { key: 'pullRequestNumber', label: 'PR', type: 'integer', required: true },
          { key: 'focus', label: 'Focus', type: 'textarea', required: false, maxLength: 1_000 },
        ],
        values: { repository: 'HatcherLabs/Hatcher', pullRequestNumber: '42', focus: '' },
        expected: { repository: 'HatcherLabs/Hatcher', pullRequestNumber: 42 },
      },
      {
        fields: [
          { key: 'company', label: 'Company', type: 'text', required: true, maxLength: 200 },
          { key: 'competitors', label: 'Competitors', type: 'string_list', required: true, maxLength: 300, maxItems: 10 },
          { key: 'market', label: 'Market', type: 'text', required: false, maxLength: 300 },
          { key: 'watchSignals', label: 'Signals', type: 'string_list', required: false, maxLength: 200, maxItems: 10 },
        ],
        values: { company: 'Hatcher', competitors: 'Alpha\nBeta', market: '', watchSignals: '' },
        expected: { company: 'Hatcher', competitors: ['Alpha', 'Beta'] },
      },
      {
        fields: [
          { key: 'product', label: 'Product', type: 'text', required: true, maxLength: 200 },
          { key: 'positioning', label: 'Positioning', type: 'textarea', required: true, maxLength: 2_000 },
          { key: 'audience', label: 'Audience', type: 'text', required: true, maxLength: 300 },
          { key: 'channels', label: 'Channels', type: 'multi_select', required: true, maxItems: 4, options: ['x', 'linkedin', 'blog', 'email'] },
          { key: 'tone', label: 'Tone', type: 'text', required: false, maxLength: 300 },
        ],
        values: { product: 'Hatcher', positioning: 'Managed agents for teams', audience: 'Operators', channels: ['x', 'email'], tone: '' },
        expected: { product: 'Hatcher', positioning: 'Managed agents for teams', audience: 'Operators', channels: ['x', 'email'] },
      },
    ];

    for (const testCase of cases) {
      const pack = normalizeOutcomePack({ id: 'test', title: 'Test', inputFields: testCase.fields });
      const initial = initializeOutcomePackInputs(pack);
      expect(initial.channels ?? '').toEqual(pack.inputFields.some((field) => field.key === 'channels') ? [] : '');
      expect(validateOutcomePackInputs(pack.inputFields, testCase.values)).toEqual({});
      expect(serializeOutcomePackInputs(pack.inputFields, testCase.values)).toEqual(testCase.expected);
    }
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
