'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Search, Star, X } from 'lucide-react';
import { api } from '@/lib/api';
import { groupChatModels } from '@/lib/chat-model-groups';
import { ModelProviderSection } from '@/components/chat/ModelProviderSection';
import { HOSTED_MODELS, type ActiveModelDisplay } from '@/lib/hosted-model-catalog';
import { formatCreditsPer1M, mergeHostedModelsWithLiveCatalog, parseModelPricingPayload, type ModelPricingPayload } from '@/lib/model-pricing';
import styles from '@/components/chat/ChatExperience.module.css';
import { MODEL_PRESETS_CHANGED, MODEL_PRESETS_STORAGE_KEY, modelPresetId, readModelPresets, writeModelPresets, type ModelPreset } from '@/lib/model-presets';

interface Props {
  activeModel: ActiveModelDisplay;
  currentModel: string;
  hosted: boolean;
  framework: string;
  disabled: boolean;
  onSelect: (model: string) => Promise<void>;
  onOpenSettings: () => void;
}

export function ChatModelSwitcher({ activeModel, currentModel, hosted, framework, disabled, onSelect, onOpenSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [catalog, setCatalog] = useState<ModelPricingPayload | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [pricingState, setPricingState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const closePicker = useCallback(() => {
    // Release the native modal's focus trap before focusing its trigger.
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    const sync = () => setPresets(readModelPresets());
    const storage = (event: StorageEvent) => { if (!event.key || event.key === MODEL_PRESETS_STORAGE_KEY) sync(); };
    sync();
    window.addEventListener(MODEL_PRESETS_CHANGED, sync);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(MODEL_PRESETS_CHANGED, sync); window.removeEventListener('storage', storage); };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    dialog.current?.showModal();
    searchInput.current?.focus();
    setCatalog(null);
    setPricingState('loading');
    void api.getModelPricing().then(response => {
      if (cancelled) return;
      const data = response.success ? parseModelPricingPayload(response.data) : null;
      setCatalog(data);
      setPricingState(data ? 'ready' : 'unavailable');
    }).catch(() => { if (!cancelled) setPricingState('unavailable'); });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !dialog.current?.contains(event.target as Node)) closePicker();
    };
    document.addEventListener('pointerdown', outside);
    return () => { cancelled = true; document.removeEventListener('pointerdown', outside); };
  }, [open, closePicker]);

  const favorites = useMemo(() => new Set(presets.filter(p => p.provider === 'openrouter' && p.favorite).map(p => p.model)), [presets]);
  const prices = useMemo(() => new Map(catalog?.models.map(model => [model.id, model.pricing]) ?? []), [catalog]);
  const allModels = useMemo(() => mergeHostedModelsWithLiveCatalog(HOSTED_MODELS, catalog, framework).filter(model => model.providerKey !== 'compute'), [catalog, framework]);
  const providers = useMemo(() => groupChatModels(allModels), [allModels]);
  const models = useMemo(() => {
    const all = allModels;
    const query = search.trim().toLowerCase();
    return all.filter(model => (!provider || model.providerKey === provider) && (!favoritesOnly || favorites.has(model.id))
      && (!query || `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(query)))
      .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || a.name.localeCompare(b.name));
  }, [allModels, search, provider, favoritesOnly, favorites]);
  const groups = useMemo(() => groupChatModels(models).map(group => ({ ...group, models: group.models.sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id))) })), [models, favorites]);

  const toggleFavorite = (model: { id: string; name: string }) => {
    const next = readModelPresets();
    const matches = next.filter(p => p.provider === 'openrouter' && p.model === model.id);
    const now = Date.now();
    const favorite = !matches.some(p => p.favorite);
    const updated = matches.length
      ? next.map(p => p.provider === 'openrouter' && p.model === model.id ? { ...p, favorite, updatedAt: now } : p)
      : [...next, { id: modelPresetId(), name: model.name, description: '', provider: 'openrouter', model: model.id,
          useCustomModel: false, customModelInput: '', favorite, createdAt: now, updatedAt: now }];
    try { writeModelPresets(updated); setError(null); }
    catch { setError('Favorites could not be saved. Check browser storage settings.'); }
  };

  const select = async (model: string) => {
    if (disabled || pending || !hosted || model === currentModel) return;
    setPending(model);
    setError(null);
    try { await onSelect(model); closePicker(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not switch model. Please try again.'); }
    finally { setPending(null); }
  };

  return (
    <div ref={root} className="relative min-w-0">
      <button ref={trigger} type="button" aria-label={`Switch model: ${activeModel.name}`} aria-expanded={open} aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
        className="inline-flex max-w-[150px] items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 sm:max-w-[240px]">
        <span className="truncate">{pending ? 'Switching model…' : activeModel.name}</span>
        {pending ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <ChevronDown size={12} className="shrink-0" />}
      </button>
      {open && createPortal(
        <dialog ref={dialog} data-agent-model-picker role="dialog" aria-label="Choose chat model" aria-modal="true" className={`${styles.dialog} ${styles.modelDialog}`}
          onCancel={event => { event.preventDefault(); closePicker(); }}
          onClick={event => {
            if (event.target !== dialog.current) return;
            const box = event.currentTarget.getBoundingClientRect();
            if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
              closePicker();
            }
          }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Chat model</span>
            <button type="button" aria-label="Close model selector" onClick={closePicker} className="rounded p-1 text-[var(--text-muted)]"><X size={16} /></button>
          </div>
          <p className="mb-3 text-xs text-[var(--text-muted)]">Applies to this agent. Switching may briefly restart it. Your chats stay saved.</p>
          {!hosted && <p className="mb-3 text-xs text-[var(--text-muted)]">This agent uses your own provider. Change its model in Model &amp; Provider settings.</p>}
          {disabled && <p role="status" className="mb-3 text-xs text-[var(--text-muted)]">Wait for the current reply or agent update before switching.</p>}
          <label className={styles.modelSearch}>
            <Search size={14} className="text-[var(--text-muted)]" />
            <input ref={searchInput} aria-label="Search models" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search models" className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none" />
          </label>
          <label className="mb-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            Provider
            <select aria-label="Filter models by provider" value={provider} onChange={event => setProvider(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-2 text-sm text-[var(--text-primary)]">
              <option value="">All providers</option>
              {providers.map(group => <option key={group.id} value={group.id}>{group.name} ({group.models.length})</option>)}
            </select>
          </label>
          <button type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(value => !value)} className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)]">
            <Star size={13} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites ({favorites.size})
          </button>
          {error && <p role="alert" className="mb-2 text-xs text-[var(--color-destructive)]">{error}</p>}
          <p className="mb-2 text-xs text-[var(--text-muted)]">AI Credits · input / output per 1M tokens, or per request where shown.</p>
          {pricingState === 'unavailable' && <p role="status" className="mb-2 text-xs text-[var(--text-muted)]">Live prices are unavailable. Reopen the selector to retry.</p>}
          <div className={styles.modelList}>
            {models.length === 0 && <p className="p-3 text-xs text-[var(--text-muted)]">{favoritesOnly ? 'No favorites match these filters. Star a model or change the filters.' : 'No models match your search.'}</p>}
            {groups.map(group => (
              <ModelProviderSection key={`${group.id}:${search}:${provider}:${favoritesOnly}`} name={group.name} count={group.models.length}
                expanded={!!search.trim() || !!provider || favoritesOnly || group.models.some(model => model.id === currentModel)}>
              {group.models.map(model => (
              <div key={model.id} className="flex items-center gap-1 rounded-lg hover:bg-[var(--bg-panel)]">
                <button type="button" disabled={disabled || !!pending || !hosted || model.id === currentModel} onClick={() => void select(model.id)} aria-label={`Use ${model.name}`}
                  className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left disabled:!opacity-100">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium text-[var(--text-primary)]">{model.name}</span>
                    <span className="block break-words text-xs text-[var(--text-muted)]">{model.provider}</span>
                    <span className="mt-1 block text-xs text-[var(--text-secondary)]">{prices.get(model.id) ? formatCreditsPer1M(prices.get(model.id)!) : pricingState === 'loading' ? 'Loading price…' : 'Price unavailable / variable'}</span>
                  </span>
                  {model.id === currentModel && <Check size={14} aria-label="Current model" className="text-[var(--color-accent)]" />}
                </button>
                <button type="button" aria-label={`${favorites.has(model.id) ? 'Remove' : 'Add'} ${model.name} ${favorites.has(model.id) ? 'from' : 'to'} favorites`} aria-pressed={favorites.has(model.id)} onClick={() => toggleFavorite(model)} className="shrink-0 rounded p-2 text-[var(--text-secondary)] hover:text-[var(--color-warning)]">
                  <Star size={15} fill={favorites.has(model.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              ))}
              </ModelProviderSection>
            ))}
          </div>
          <div className="mt-2 border-t border-[var(--border-default)] pt-2">
            {catalog?.billingNote && <p className="mb-2 text-xs text-[var(--text-muted)]">{catalog.billingNote}</p>}
            <p className="mb-2 text-[10px] text-[var(--text-muted)]">Favorites are saved in this browser and shared with Model &amp; Provider presets.</p>
            <button type="button" onClick={() => { closePicker(); onOpenSettings(); }} className="text-xs text-[var(--color-accent)]">Model &amp; Provider settings</button>
          </div>
        </dialog>, document.body,
      )}
    </div>
  );
}
