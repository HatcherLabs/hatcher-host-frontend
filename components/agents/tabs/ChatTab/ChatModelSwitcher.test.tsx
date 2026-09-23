// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatModelSwitcher } from './ChatModelSwitcher';
import { MODEL_PRESETS_STORAGE_KEY, readModelPresets, writeModelPresets } from '@/lib/model-presets';

vi.mock('@/lib/api', () => ({ api: { getModelPricing: vi.fn(async () => ({ success: false })) } }));
vi.mock('@/lib/hosted-model-catalog', () => ({ HOSTED_MODELS: [
  { id: 'model-a', name: 'Alpha', provider: 'Provider A' },
  { id: 'model-b', name: 'Beta', provider: 'Provider B' },
] }));
vi.mock('@/lib/model-pricing', () => ({ mergeHostedModelsWithLiveCatalog: (models: unknown) => models, parseModelPricingPayload: () => null }));

let host: HTMLDivElement;
let root: Root;
const activeModel = { id: 'model-a', name: 'Alpha', provider: 'Provider A', route: '', privacy: '', tags: [] };
const props = () => ({ activeModel, currentModel: 'model-a', hosted: true, framework: 'hermes', disabled: false, onSelect: vi.fn(async () => {}), onOpenSettings: vi.fn() });
function button(label: string): HTMLButtonElement {
  const found = Array.from(host.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === label || b.textContent?.trim() === label);
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
async function click(label: string) { await act(async () => { button(label).click(); }); }
async function render(p = props()) { await act(async () => { root.render(<ChatModelSwitcher {...p} />); }); return p; }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('chat model switcher', () => {
  it('stars a model, shares it with Config presets, filters favorites and persists across mounts', async () => {
    await render(); await click('Switch model: Alpha'); await click('Add Beta to favorites');
    expect(readModelPresets()).toEqual([expect.objectContaining({ model: 'model-b', favorite: true, provider: 'openrouter' })]);
    await click('Favorites (1)');
    expect(host.textContent).toContain('Beta'); expect(host.querySelector('[aria-label="Use Alpha"]')).toBeNull();
    await act(async () => root.unmount()); root = createRoot(host); await render(); await click('Switch model: Alpha');
    expect(button('Remove Beta from favorites').getAttribute('aria-pressed')).toBe('true');
  });

  it('switches without navigating away, and only closes after a successful save', async () => {
    let finish!: () => void;
    const p = props(); p.onSelect = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    await render(p); await click('Switch model: Alpha'); await click('Use Beta');
    expect(p.onSelect).toHaveBeenCalledExactlyOnceWith('model-b');
    expect(button('Use Beta').disabled).toBe(true); expect(host.textContent).toContain('Switching model');
    await act(async () => finish());
    expect(host.querySelector('[role="dialog"]')).toBeNull(); expect(p.onOpenSettings).not.toHaveBeenCalled();
  });

  it('keeps the selector open and reports failed saves', async () => {
    const p = props(); p.onSelect.mockRejectedValue(new Error('Service unavailable'));
    await render(p); await click('Switch model: Alpha'); await click('Use Beta');
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Service unavailable');
    expect(button('Use Beta').disabled).toBe(false);
  });

  it.each([{ disabled: true, hosted: true }, { disabled: false, hosted: false }])('prevents switching during a turn or for BYOK: %j', async flags => {
    const p = { ...props(), ...flags }; await render(p); await click('Switch model: Alpha'); await click('Use Beta');
    expect(button('Use Beta').disabled).toBe(true); expect(p.onSelect).not.toHaveBeenCalled();
  });

  it('recovers malformed storage, syncs Config favorites and handles Escape', async () => {
    localStorage.setItem(MODEL_PRESETS_STORAGE_KEY, '{broken');
    await render(); await click('Switch model: Alpha');
    await act(async () => writeModelPresets([{ id: 'existing', name: 'Beta', provider: 'openrouter', model: 'model-b', favorite: true, description: '', useCustomModel: false, customModelInput: '', createdAt: 1, updatedAt: 1 }]));
    expect(button('Remove Beta from favorites')).toBeTruthy();
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(host.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(button('Switch model: Alpha'));
  });

  it('searches by model name and provider without changing the active model', async () => {
    const p = await render(); await click('Switch model: Alpha');
    const input = host.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Provider B');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('[aria-label="Use Alpha"]')).toBeNull();
    expect(button('Use Beta')).toBeTruthy(); expect(p.onSelect).not.toHaveBeenCalled();
  });
  it('reports storage failure without losing the model picker', async () => {
    await render(); await click('Switch model: Alpha');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await click('Add Beta to favorites');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
    expect(button('Use Beta').disabled).toBe(false);
  });
});