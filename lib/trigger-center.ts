import type { AgentTriggerConfig, AgentTriggerType } from '@/lib/api';

export function triggerSourceLabel(type: AgentTriggerType): string {
  if (type === 'github') return 'GitHub';
  if (type === 'price_move') return 'Price move';
  return 'Solana on-chain';
}

export function describeTriggerConfig(config: AgentTriggerConfig): string {
  if ('repository' in config) return `${config.repository} · ${config.events.join(', ')}`;
  if ('address' in config) return `${config.address.slice(0, 6)}…${config.address.slice(-5)} · ${config.commitment}`;
  const asset = config.symbol || `${config.mint.slice(0, 5)}…${config.mint.slice(-4)}`;
  if ('targetPriceUsd' in config) return `${asset} ${config.condition} $${config.targetPriceUsd}`;
  return `${asset} ${config.condition === 'change_up' ? 'up' : 'down'} ${config.changePercent}% / ${config.windowMinutes}m`;
}
