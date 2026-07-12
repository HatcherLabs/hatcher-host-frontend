import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OUTCOME_PACK_COPY_SLUGS,
  createOutcomePackIdempotencyKey,
  initializeOutcomePackInputs,
  isOutcomePackLaunchReady,
  localizeOutcomePackModel,
  localizeOutcomePackPreparationModel,
  normalizeOutcomePack,
  normalizeOutcomePackList,
  normalizeOutcomePackPreparation,
  outcomePackCopySlug,
  outcomePackSetupTab,
  serializeOutcomePackInputs,
  validateOutcomePackInputs,
  type OutcomePackDraftInputs,
} from '@/lib/outcome-packs';

describe('outcome packs', () => {
  it('orders first-party packs while preserving server-provided additions', () => {
    const packs = normalizeOutcomePackList({
      packs: [
        { id: 'launch-content-v1', title: 'Launch content' },
        { id: 'unknown-pack', title: 'Unknown' },
        { id: 'portfolio-risk-review-v1', title: 'Portfolio risk review' },
        { id: 'research-report-v1', title: 'Research report' },
        { id: 'trade-plan-review-v1', title: 'Trade plan review' },
        { id: 'competitor-watch-v1', title: 'Competitor watch' },
        { id: 'market-pulse-v1', title: 'Market pulse' },
        { id: 'pr-review-v1', title: 'PR review' },
      ],
    });

    expect(packs.map((pack) => pack.id)).toEqual([
      'market-pulse-v1',
      'trade-plan-review-v1',
      'portfolio-risk-review-v1',
      'research-report-v1',
      'competitor-watch-v1',
      'launch-content-v1',
      'pr-review-v1',
      'unknown-pack',
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
      reviewPolicy: { mode: 'manual_required' },
    });

    expect(pack).toMatchObject({
      summary: 'A cited decision brief.',
      category: 'Research',
      requiredSkills: ['web-search'],
      budgetTargetAiCredits: 80,
      maxRuntimeSeconds: 1200,
      reviewPolicy: { mode: 'manual_required' },
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
      reviewPolicy: { mode: 'manual_required' },
    } });

    expect(preparation.pack.id).toBe('pr-review-v1');
    expect(preparation.agent?.name).toBe('Atlas');
    expect(preparation.missingPrerequisites[0]).toEqual({ id: 'github', label: 'GitHub repository' });
    expect(preparation.warnings).toEqual([{
      code: 'legacy_warning_1',
      label: 'Budget is advisory.',
      params: {},
    }]);
    expect(preparation.resolvedTasks[0]).toMatchObject({ title: 'Review PR', prompt: 'Review PR 42.' });
    expect(preparation.budgetTargetAiCredits).toBe(42);
    expect(preparation.maxRuntimeSeconds).toBe(900);
    expect(preparation.reviewPolicy).toEqual({ mode: 'manual_required' });
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
          { key: 'assets', label: 'Assets', type: 'string_list', required: true, maxLength: 100, maxItems: 10 },
          { key: 'horizon', label: 'Horizon', type: 'text', required: true, maxLength: 200 },
          { key: 'focus', label: 'Focus', type: 'textarea', required: false, maxLength: 1_000 },
          { key: 'watchSignals', label: 'Signals', type: 'string_list', required: false, maxLength: 200, maxItems: 10 },
          { key: 'outputLanguage', label: 'Language', type: 'text', required: false, maxLength: 64 },
        ],
        values: { assets: 'SOL\nBTC', horizon: '7 days', focus: '', watchSignals: 'volume\nliquidity', outputLanguage: '' },
        expected: { assets: ['SOL', 'BTC'], horizon: '7 days', watchSignals: ['volume', 'liquidity'] },
      },
      {
        fields: [
          { key: 'asset', label: 'Asset', type: 'text', required: true, maxLength: 100 },
          { key: 'network', label: 'Network', type: 'text', required: true, maxLength: 100 },
          { key: 'direction', label: 'Direction', type: 'select', required: true, options: ['long', 'short'] },
          { key: 'capitalAmount', label: 'Capital amount', type: 'text', required: true, maxLength: 40 },
          { key: 'capitalCurrency', label: 'Capital currency', type: 'text', required: true, maxLength: 12 },
          { key: 'maxLossPercent', label: 'Max loss', type: 'text', required: true, maxLength: 6 },
          { key: 'horizon', label: 'Horizon', type: 'text', required: true, maxLength: 200 },
          { key: 'thesis', label: 'Thesis', type: 'textarea', required: true, maxLength: 2_000 },
        ],
        values: { asset: 'SOL', network: 'Solana', direction: 'long', capitalAmount: '1000', capitalCurrency: 'USDC', maxLossPercent: '5', horizon: '2 weeks', thesis: 'Liquidity and catalyst thesis.' },
        expected: { asset: 'SOL', network: 'Solana', direction: 'long', capitalAmount: '1000', capitalCurrency: 'USDC', maxLossPercent: '5', horizon: '2 weeks', thesis: 'Liquidity and catalyst thesis.' },
      },
      {
        fields: [
          { key: 'holdings', label: 'Holdings', type: 'string_list', required: true, maxLength: 140, maxItems: 10 },
          { key: 'baseCurrency', label: 'Base currency', type: 'text', required: true, maxLength: 12 },
          { key: 'objective', label: 'Objective', type: 'textarea', required: true, maxLength: 1_000 },
          { key: 'constraints', label: 'Constraints', type: 'string_list', required: false, maxLength: 300, maxItems: 10 },
        ],
        values: { holdings: 'SOL: 60%\nBTC: 40%', baseCurrency: 'USD', objective: 'Review downside concentration and liquidity.', constraints: '' },
        expected: { holdings: ['SOL: 60%', 'BTC: 40%'], baseCurrency: 'USD', objective: 'Review downside concentration and liquidity.' },
      },
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

  it('normalizes stable warning codes and first-party localization slugs', () => {
    const preparation = normalizeOutcomePackPreparation({
      pack: { id: 'research-report-v1' },
      warnings: [{
        code: 'required_skills_pending',
        label: 'Fallback warning',
        params: { count: 2 },
      }],
    });

    expect(preparation.warnings).toEqual([{
      code: 'required_skills_pending',
      label: 'Fallback warning',
      params: { count: 2 },
    }]);
    expect(outcomePackCopySlug('research-report-v1')).toBe('researchReport');
    expect(outcomePackCopySlug('unknown-pack')).toBeNull();
    expect(Object.keys(OUTCOME_PACK_COPY_SLUGS)).toEqual([
      'market-pulse-v1',
      'trade-plan-review-v1',
      'portfolio-risk-review-v1',
      'research-report-v1',
      'pr-review-v1',
      'competitor-watch-v1',
      'launch-content-v1',
    ]);
  });

  it('keeps central Outcome Pack copy and ICU placeholders in parity across all locales', () => {
    const messagesDir = resolve(process.cwd(), 'messages');
    const localeFiles = readdirSync(messagesDir).filter((file) => file.endsWith('.json')).sort();
    const flatten = (value: unknown, prefix = '', output: Record<string, string> = {}) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) {
          flatten(child, prefix ? `${prefix}.${key}` : key, output);
        }
      } else {
        output[prefix] = String(value);
      }
      return output;
    };
    const variables = (value: string) => [...value.matchAll(/\{\s*([\w]+)(?:\s*,[^}]*)?\}/g)]
      .map((match) => match[1])
      .sort();
    const readContent = (file: string) => {
      const messages = JSON.parse(readFileSync(resolve(messagesDir, file), 'utf8')) as {
        outcomePacks?: { content?: unknown };
      };
      return flatten(messages.outcomePacks?.content);
    };
    const english = readContent('en.json');

    expect(localeFiles).toEqual([
      'de.json', 'en.json', 'es.json', 'fr.json', 'hi.json', 'id.json',
      'ja.json', 'pt-BR.json', 'ro.json', 'tr.json', 'vi.json', 'zh.json',
    ]);
    for (const file of localeFiles) {
      const localized = readContent(file);
      const root = JSON.parse(readFileSync(resolve(messagesDir, file), 'utf8')) as {
        dashboard?: { common?: { content?: unknown } };
      };
      expect(root.dashboard?.common?.content, `${file}:misplaced content`).toBeUndefined();
      expect(Object.keys(localized).sort(), file).toEqual(Object.keys(english).sort());
      for (const key of Object.keys(english)) {
        expect(variables(localized[key]!), `${file}:${key}`).toEqual(variables(english[key]!));
      }
    }
  });

  it('uses translated central pack fixtures in Romanian, German, and Japanese', () => {
    const messagesDir = resolve(process.cwd(), 'messages');
    const lookup = (locale: string, path: string): string => {
      const messages = JSON.parse(readFileSync(resolve(messagesDir, `${locale}.json`), 'utf8')) as Record<string, unknown>;
      return path.split('.').reduce<unknown>((value, segment) => (
        value && typeof value === 'object' ? (value as Record<string, unknown>)[segment] : undefined
      ), messages) as string;
    };
    const paths = [
      'outcomePacks.content.packs.marketPulse.summary',
      'outcomePacks.content.packs.tradePlanReview.manualAcceptance',
      'outcomePacks.content.packs.portfolioRiskReview.taskDescription',
      'outcomePacks.content.packs.researchReport.summary',
      'outcomePacks.content.packs.pullRequestReview.fields.focus',
      'outcomePacks.content.packs.competitorWatch.manualAcceptance',
      'outcomePacks.content.packs.launchContent.taskDescription',
    ];

    const rawPack = normalizeOutcomePack({
      id: 'research-report-v1',
      title: 'Research Report',
      summary: 'Produce a sourced, decision-ready research report on a focused topic.',
      category: 'research',
      inputFields: [{ key: 'topic', label: 'Topic', type: 'textarea', required: true }],
      deliverables: ['Structured report'],
      acceptanceChecks: [{ type: 'manual', label: 'Sources support the central claims.' }],
    });
    const rawPreparation = normalizeOutcomePackPreparation({
      pack: { id: 'competitor-watch-v1', version: '1.0.0', title: 'Competitor Watch' },
      missingPrerequisites: [{
        id: 'github_connection',
        label: 'Configure GitHub Connect or a GitHub runtime token for this agent.',
      }],
      warnings: [{
        code: 'required_skills_pending',
        label: 'Missing skills will be queued.',
        params: { count: 2 },
      }],
      resolvedTasks: [{
        id: 'competitor-baseline',
        title: 'Competitor watch',
        description: 'Establish a current, source-backed competitor baseline.',
        prompt: 'Canonical execution prompt',
      }],
      schedules: [{
        id: 'daily-competitor-watch',
        label: 'Daily competitor watch',
        cron: '0 9 * * *',
        timezone: 'UTC',
      }],
    });

    for (const locale of ['ro', 'de', 'ja']) {
      for (const path of paths) {
        expect(lookup(locale, path), `${locale}:${path}`).not.toBe(lookup('en', path));
      }
      const translate = (key: string, fallback: string) => (
        lookup(locale, `outcomePacks.${key}`) ?? fallback
      );
      const pack = localizeOutcomePackModel(rawPack, translate);
      const preparation = localizeOutcomePackPreparationModel(rawPreparation, translate);
      expect(pack.summary, `${locale}:pack summary`).not.toBe(rawPack.summary);
      expect(pack.inputFields[0]?.label, `${locale}:field label`).not.toBe(rawPack.inputFields[0]?.label);
      expect(pack.deliverables[0]?.label, `${locale}:deliverable`).not.toBe(rawPack.deliverables[0]?.label);
      expect(pack.acceptanceChecks[0]?.label, `${locale}:acceptance`).not.toBe(rawPack.acceptanceChecks[0]?.label);
      expect(preparation.resolvedTasks[0]?.title, `${locale}:task title`)
        .not.toBe(rawPreparation.resolvedTasks[0]?.title);
      expect(preparation.missingPrerequisites[0]?.label, `${locale}:prerequisite`)
        .not.toBe(rawPreparation.missingPrerequisites[0]?.label);
      expect(preparation.warnings[0]?.label, `${locale}:warning`)
        .not.toBe(rawPreparation.warnings[0]?.label);
      expect(preparation.schedules[0]?.label, `${locale}:schedule`)
        .not.toBe(rawPreparation.schedules[0]?.label);
    }
  });
});
