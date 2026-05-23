import { describe, expect, it } from 'vitest';
import { summarizeAgentCommLogs } from './developerWorkflows';

describe('developer workflows helpers', () => {
  it('summarizes recent agent communication logs for the dev dashboard', () => {
    const summary = summarizeAgentCommLogs([
      { status: 'success', latencyMs: 120 },
      { status: 'error', latencyMs: 80 },
      { status: 'success', latencyMs: 100 },
    ]);

    expect(summary).toEqual({
      total: 3,
      successes: 2,
      failures: 1,
      averageLatencyMs: 100,
    });
  });

  it('handles empty logs without NaN values', () => {
    expect(summarizeAgentCommLogs([])).toEqual({
      total: 0,
      successes: 0,
      failures: 0,
      averageLatencyMs: 0,
    });
  });
});
