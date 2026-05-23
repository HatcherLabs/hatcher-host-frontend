export interface AgentCommLogLike {
  status: string;
  latencyMs: number;
}

export interface AgentCommSummary {
  total: number;
  successes: number;
  failures: number;
  averageLatencyMs: number;
}

export function summarizeAgentCommLogs(logs: AgentCommLogLike[]): AgentCommSummary {
  const total = logs.length;
  const successes = logs.filter((log) => log.status === 'success').length;
  const failures = logs.filter((log) => log.status !== 'success').length;
  const latencyTotal = logs.reduce((sum, log) => sum + Math.max(0, log.latencyMs || 0), 0);

  return {
    total,
    successes,
    failures,
    averageLatencyMs: total > 0 ? Math.round(latencyTotal / total) : 0,
  };
}
