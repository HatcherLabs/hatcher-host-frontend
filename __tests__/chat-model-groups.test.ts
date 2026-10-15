import { describe, expect, it } from 'vitest';
import { groupChatModels } from '../lib/chat-model-groups';

describe('chat provider choices', () => {
  it('puts familiar providers first while preserving every catalog model', () => {
    const models = ['qwen/q1', 'unknown/m1', 'google/g1', 'deepseek/deepseek-v4-pro', 'anthropic/c1', 'openai/o1', 'deepseek/deepseek-v4-flash', 'local-model'].map(id => ({ id, name: id }));
    const groups = groupChatModels(models);
    expect(groups.map(g => g.id)).toEqual(['openai', 'anthropic', 'google', 'deepseek', 'qwen', 'other', 'unknown']);
    expect(groups.flatMap(g => g.models).map(m => m.id).sort()).toEqual(models.map(m => m.id).sort());
    expect(groups.find(g => g.id === 'deepseek')?.models[0].id).toBe('deepseek/deepseek-v4-flash');
  });
  it('only displays providers actually available in the guest catalog', () => {
    expect(groupChatModels([{ id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash' }]).map(g => g.id)).toEqual(['deepseek']);
    expect(groupChatModels([])).toEqual([]);
  });
});
