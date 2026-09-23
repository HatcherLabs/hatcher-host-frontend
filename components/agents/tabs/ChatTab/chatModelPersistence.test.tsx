// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentConfig } from '@/hooks/useAgentConfig';
import { api, type Agent } from '@/lib/api';
vi.mock('@/lib/api', () => ({ api: { updateAgent: vi.fn() } }));
let root: Root;
let host: HTMLDivElement;
let config: ReturnType<typeof useAgentConfig>;
const setAgent = vi.fn();
const agent = { id: 'agent-1', name: 'Test Agent', description: '', status: 'active', framework: 'hermes', config: { provider: 'openrouter', model: 'old-model', systemPrompt: 'Keep my identity', skills: ['my-skill'] } } as unknown as Agent;
function Harness({ current = agent }: { current?: Agent }) { config = useAgentConfig(current, current.id, setAgent); return null; }
beforeEach(async () => { vi.clearAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement('div'); root = createRoot(host); await act(async () => root.render(<Harness />)); });
afterEach(async () => { await act(async () => root.unmount()); });
describe('chat model persistence', () => {
  it('saves only model settings and exposes restart state without saving draft identity changes', async () => {
    await act(async () => config.setConfigSystemPrompt('Unsaved draft'));
    vi.mocked(api.updateAgent).mockResolvedValue({ success: true, data: { ...agent, restarting: true } } as never);
    await act(async () => config.switchChatModel('new-model'));
    expect(api.updateAgent).toHaveBeenCalledExactlyOnceWith('agent-1', {
      config: { provider: 'openrouter', model: 'new-model', byok: null, settings: { model: 'new-model', modelProvider: 'openrouter' } },
      commitMessage: 'Switch model from chat',
    });
    expect(setAgent).toHaveBeenCalledWith(expect.objectContaining({ status: 'starting' }));
    expect(config.saving).toBe(false);
  });
  it('keeps the old agent on failure and clears the busy state', async () => {
    vi.mocked(api.updateAgent).mockResolvedValue({ success: false, error: 'Save failed' } as never);
    await act(async () => { await expect(config.switchChatModel('new-model')).rejects.toThrow('Save failed'); });
    expect(setAgent).not.toHaveBeenCalled(); expect(config.saving).toBe(false);
  });
  it('does not overwrite BYOK credentials', async () => {
    await act(async () => root.render(<Harness current={{ ...agent, config: { provider: 'anthropic', model: 'byok-model' } } as Agent} />));
    await expect(config.switchChatModel('new-model')).rejects.toThrow('own provider');
    expect(api.updateAgent).not.toHaveBeenCalled();
  });
});