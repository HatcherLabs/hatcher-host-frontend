'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, Star, X } from 'lucide-react';
import { api } from '@/lib/api';
import { HOSTED_MODELS, type ActiveModelDisplay } from '@/lib/hosted-model-catalog';
import { mergeHostedModelsWithLiveCatalog, parseModelPricingPayload, type ModelPricingPayload } from '@/lib/model-pricing';
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [catalog, setCatalog] = useState<ModelPricingPayload | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

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
    searchInput.current?.focus();
    void api.getModelPricing().then(response => {
      if (!cancelled && response.success) setCatalog(parseModelPricingPayload(response.data));
    }).catch(() => { /* The bundled catalog remains available. */ });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { cancelled = true; document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  const favorites = useMemo(() => new Set(presets.filter(p => p.provider === 'openrouter' && p.favorite).map(p => p.model)), [presets]);
  const models = useMemo(() => {
    const all = mergeHostedModelsWithLiveCatalog(HOSTED_MODELS, catalog, framework).filter(model => model.providerKey !== 'compute');
    const query = search.trim().toLowerCase();
    return all.filter(model => (!favoritesOnly || favorites.has(model.id))
      && (!query || `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(query)))
      .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || a.name.localeCompare(b.name));
  }, [catalog, search, favoritesOnly, favorites, framework]);

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
    try { await onSelect(model); setOpen(false); trigger.current?.focus(); }
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
      {open && (
        <div role="dialog" aria-label="Choose chat model" className="absolute left-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-3rem))] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-xl max-sm:fixed max-sm:left-4 max-sm:top-28">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Chat model</span>
            <button type="button" aria-label="Close model selector" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="rounded p-1 text-[var(--text-muted)]"><X size={16} /></button>
          </div>
          <p className="mb-3 text-xs text-[var(--text-muted)]">Applies to this agent. Switching may briefly restart it. Your chats stay saved.</p>
          {!hosted && <p className="mb-3 text-xs text-[var(--text-muted)]">This agent uses your own provider. Change its model in Model &amp; Provider settings.</p>}
          {disabled && <p role="status" className="mb-3 text-xs text-[var(--text-muted)]">Wait for the current reply or agent update before switching.</p>}
          <label className="mb-2 flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-2 py-2">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input ref={searchInput} aria-label="Search models" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search models" className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none" />
          </label>
          <button type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(value => !value)} className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)]">
            <Star size={13} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites ({favorites.size})
          </button>
          {error && <p role="alert" className="mb-2 text-xs text-[var(--color-destructive)]">{error}</p>}
          <div className="max-h-[min(320px,40dvh)] overflow-y-auto">
            {models.length === 0 && <p className="p-3 text-xs text-[var(--text-muted)]">{favoritesOnly ? 'Star a model to add it to your favorites.' : 'No models match your search.'}</p>}
            {models.map(model => (
              <div key={model.id} className="flex items-center gap-1 rounded-lg hover:bg-[var(--bg-panel)]">
                <button type="button" disabled={disabled || !!pending || !hosted || model.id === currentModel} onClick={() => void select(model.id)} aria-label={`Use ${model.name}`}
                  className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left disabled:opacity-50">
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-[var(--text-primary)]">{model.name}</span><span className="block truncate text-[10px] text-[var(--text-muted)]">{model.provider}</span></span>
                  {model.id === currentModel && <Check size={14} aria-label="Current model" className="text-[var(--color-accent)]" />}
                </button>
                <button type="button" aria-label={`${favorites.has(model.id) ? 'Remove' : 'Add'} ${model.name} ${favorites.has(model.id) ? 'from' : 'to'} favorites`} aria-pressed={favorites.has(model.id)} onClick={() => toggleFavorite(model)} className="shrink-0 rounded p-2 text-[var(--text-secondary)] hover:text-[var(--color-warning)]">
                  <Star size={15} fill={favorites.has(model.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-[var(--border-default)] pt-2">
            <p className="mb-2 text-[10px] text-[var(--text-muted)]">Favorites are saved in this browser and shared with Model &amp; Provider presets.</p>
            <button type="button" onClick={() => { setOpen(false); onOpenSettings(); }} className="text-xs text-[var(--color-accent)]">Model &amp; Provider settings</button>
          </div>
        </div>
      )}
    </div>
  );
}