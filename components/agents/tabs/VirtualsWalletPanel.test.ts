import { describe, expect, it } from 'vitest';

import {
  VIRTUALS_BUDGET_PRESETS,
  applyVirtualsBudgetPreset,
  buildVirtualsSettingsPayload,
  getHatcherServiceCardCopy,
  getSelectedHatcherService,
  getVirtualsOperatorCopy,
  getVirtualsPublishResultCopy,
} from './VirtualsWalletPanel';
import type { VirtualsHatcherService } from '@/lib/api';

const baseForm = {
  enabled: true,
  allowRuntimeSearch: false,
  allowJobDrafts: true,
  dailyBudgetUsd: '25',
  maxPerJobUsd: '5',
  preferredModel: 'moonshotai-kimi-k2-5',
  scoutQueries: 'mcp\nsecurity audit',
};

describe('Virtuals wallet panel helpers', () => {
  it('applies budget presets without changing access toggles', () => {
    expect(VIRTUALS_BUDGET_PRESETS.map((preset) => preset.id)).toEqual(['safe', 'standard', 'custom']);

    const safe = applyVirtualsBudgetPreset(baseForm, 'safe');

    expect(safe).toMatchObject({
      enabled: true,
      allowRuntimeSearch: false,
      allowJobDrafts: true,
      dailyBudgetUsd: '5',
      maxPerJobUsd: '1',
    });
    expect(buildVirtualsSettingsPayload(safe)).toMatchObject({
      enabled: true,
      allowRuntimeSearch: false,
      allowJobDrafts: true,
      dailyBudgetUsd: 5,
      maxPerJobUsd: 1,
    });
  });

  it('summarizes Hatcher-managed service cards with user-facing labels', () => {
    const services: VirtualsHatcherService[] = [{
      id: 'hosted-agent-execution',
      title: 'Hosted agent execution',
      summary: 'Run a requested agent task inside Hatcher-managed infrastructure.',
      category: 'execution',
      providerName: 'HatcherLabs',
      providerWalletAddress: '0xHatcher',
      providerConsoleAgentId: 'console-id',
      offeringName: 'hatcher_hosted_agent_execution',
      priceValue: 5,
      priceType: 'fixed',
      slaMinutes: 240,
      publishable: true,
      idealFor: ['agent task execution'],
      outcomes: ['Execution transcript'],
      requirementTemplate: { task: 'Describe the agent task to run' },
      deliverableTemplate: { summary: 'What the agent completed' },
      publishPayload: {
        agentId: 'agent-id',
        consoleAgentId: 'console-id',
        providerWalletAddress: '0xHatcher',
        offeringName: 'hatcher_hosted_agent_execution',
        name: 'Hosted agent execution',
        description: 'Run a requested agent task inside Hatcher-managed infrastructure.',
        priceValue: 5,
        priceType: 'fixed',
        slaMinutes: 240,
        requirement: { task: 'Describe the agent task to run' },
        deliverable: { summary: 'What the agent completed' },
      },
    }, {
      id: 'agent-audit',
      title: 'Agent audit',
      summary: 'Review an agent for launch readiness.',
      category: 'review',
      providerName: 'HatcherLabs',
      providerWalletAddress: '0xHatcher',
      providerConsoleAgentId: 'console-id',
      offeringName: 'agentAudit',
      priceValue: 4,
      priceType: 'fixed',
      slaMinutes: 180,
      publishable: true,
      idealFor: ['agent safety'],
      outcomes: ['Audit report'],
      requirementTemplate: { agentUrl: 'URL or identifier' },
      deliverableTemplate: { summary: 'Audit summary' },
      publishPayload: {
        agentId: 'agent-id',
        consoleAgentId: 'console-id',
        providerWalletAddress: '0xHatcher',
        offeringName: 'agentAudit',
        name: 'Agent audit',
        description: 'Review an agent for launch readiness.',
        priceValue: 4,
        priceType: 'fixed',
        slaMinutes: 180,
        requirement: { agentUrl: 'URL or identifier' },
        deliverable: { summary: 'Audit summary' },
      },
    }];

    expect(getHatcherServiceCardCopy(services[0])).toEqual({
      statusLabel: 'Ready to publish',
      priceLabel: '$5',
      slaLabel: '4h SLA',
      primaryUse: 'agent task execution',
      firstOutcome: 'Execution transcript',
    });
    expect(getSelectedHatcherService(services, 'agent-audit')?.id).toBe('agent-audit');
    expect(getSelectedHatcherService(services, 'removed-service')?.id).toBe('hosted-agent-execution');
    expect(getSelectedHatcherService([], 'agent-audit')).toBeNull();
  });

  it('summarizes the ACP operator and publish results without exposing command internals first', () => {
    expect(getVirtualsOperatorCopy({
      enabled: true,
      eventsFile: '/tmp/hatcher-virtuals-acp-events.jsonl',
      command: { file: 'npx', args: [], display: 'npx --yes @virtuals-protocol/acp-cli --help' },
      listenCommand: { file: 'npx', args: [], display: 'npx --yes @virtuals-protocol/acp-cli events listen' },
      hatcherLabsAgent: { id: 'agent-id', walletAddress: '0xHatcher' },
    })).toEqual({
      statusLabel: 'Operator ready',
      detailLabel: 'Listening plan configured',
      tone: 'good',
    });

    expect(getVirtualsPublishResultCopy({
      dryRun: true,
      results: [{ serviceId: 'agent-audit', offeringName: 'agentAudit', dryRun: true, executed: false }],
    })).toEqual({
      title: 'Publish preview ready',
      detail: '1 service command prepared',
    });
  });
});
