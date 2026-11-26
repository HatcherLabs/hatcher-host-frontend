import { DEFAULT_CHAT_MODEL } from './direct-chat';

const popular = ['openai', 'anthropic', 'google', 'deepseek', 'x-ai', 'meta-llama', 'mistralai', 'qwen'];
const names: Record<string, string> = {
  openai: 'OpenAI · ChatGPT', anthropic: 'Anthropic · Claude', google: 'Google · Gemini',
  deepseek: 'DeepSeek', 'x-ai': 'xAI · Grok', 'meta-llama': 'Meta · Llama', mistralai: 'Mistral', qwen: 'Qwen', other: 'Other',
};
export function modelProvider(id: string) { return id.includes('/') ? id.split('/')[0].toLowerCase() : 'other'; }
export function groupChatModels<T extends { id: string; name: string; providerKey?: string; provider?: string }>(models: T[]) {
  const groups = new Map<string, T[]>();
  for (const model of models) {
    const provider = model.providerKey || modelProvider(model.id);
    const items = groups.get(provider);
    if (items) items.push(model);
    else groups.set(provider, [model]);
  }
  const rank = (id: string) => popular.includes(id) ? popular.indexOf(id) : popular.length;
  return [...groups].map(([id, items]) => ({ id, name: names[id] ?? items[0]?.provider ?? id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()),
    models: items.sort((a, b) => Number(b.id === DEFAULT_CHAT_MODEL) - Number(a.id === DEFAULT_CHAT_MODEL) || a.name.localeCompare(b.name)),
  })).sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
}
