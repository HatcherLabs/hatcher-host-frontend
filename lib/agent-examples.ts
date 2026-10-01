/** Stable identifiers keep example links short and survive sign-in. */
export const AGENT_EXAMPLE_IDS = [
  'personal',
  'trader',
  'email',
  'messages',
  'coding',
  'research',
] as const;

export type AgentExampleId = (typeof AGENT_EXAMPLE_IDS)[number];

export function resolveAgentExample(value: unknown): AgentExampleId | undefined {
  return typeof value === 'string'
    ? AGENT_EXAMPLE_IDS.find((id) => id === value)
    : undefined;
}

export function agentExampleHref(example?: AgentExampleId): string {
  return example ? `/create?example=${example}` : '/create';
}
