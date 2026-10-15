'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { DEFAULT_CHAT_MODEL, type ChatModel } from '@/lib/direct-chat';
import { groupChatModels } from '@/lib/chat-model-groups';
import styles from './ChatModelPicker.module.css';

export default function ChatModelPicker({ models, value, disabled, onChange }: {
  models: ChatModel[]; value: string; disabled: boolean; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const groups = useMemo(() => groupChatModels(models), [models]);
  const group = groups.find(item => item.id === provider);
  const selected = models.find(item => item.id === value);
  const recommended = models.find(item => item.id === DEFAULT_CHAT_MODEL);
  const filtered = group?.models.filter(item => `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase().trim())) ?? [];
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  function choose(id: string) { if (!disabled) { onChange(id); setOpen(false); } }
  return <>
    <button type="button" className={styles.trigger} disabled={disabled || !models.length} aria-haspopup="dialog"
      aria-label={`Choose model: ${selected?.name ?? 'Models unavailable'}`} onClick={() => { setProvider(null); setSearch(''); setOpen(true); }}>
      <span>{selected?.name ?? 'Models unavailable'}</span><ChevronDown size={15} />
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="chat-model-picker-title" onClose={() => setOpen(false)}
      onClick={event => { if (event.target === dialog.current) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false); } }}>
      <div className={styles.heading}>
        <div><h2 id="chat-model-picker-title">{group ? group.name : 'Choose a provider'}</h2>
          <p>{group ? 'Choose a model for this conversation.' : 'Start with a provider, then choose its model.'}</p></div>
        <button type="button" aria-label="Close model picker" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      {group ? <>
        <button type="button" className={styles.back} onClick={() => { setProvider(null); setSearch(''); }}><ArrowLeft size={15} /> All providers</button>
        <label className={styles.search}><Search size={17} /><input aria-label="Search models" placeholder={`Search ${group.name.split(' · ')[0]} models`} value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className={styles.list}>
          {filtered.map(model => <button type="button" key={model.id} className={styles.row} disabled={disabled} onClick={() => choose(model.id)}>
            <span><strong>{model.name}</strong>{model.id === DEFAULT_CHAT_MODEL && <small>Recommended · default</small>}</span>
            {value === model.id ? <Check size={18} aria-label="Selected" /> : <ChevronRight size={16} />}
          </button>)}
          {!filtered.length && <p className={styles.empty}>No matching models. Try another name.</p>}
        </div>
      </> : <>
        {recommended && <button type="button" className={styles.recommended} disabled={disabled} onClick={() => choose(recommended.id)}>
          <span><small>NOT SURE WHERE TO START?</small><strong>{recommended.name}</strong><small>Recommended · default for everyday chat</small></span>
          {value === recommended.id ? <Check size={18} /> : <ChevronRight size={18} />}
        </button>}
        <div className={styles.list}>{groups.map(item => <button type="button" className={styles.row} key={item.id} onClick={() => { setProvider(item.id); setSearch(''); }}>
          <span><strong>{item.name}</strong><small>{item.models.length} {item.models.length === 1 ? 'model' : 'models'}</small></span><ChevronRight size={17} />
        </button>)}</div>
      </>}
    </dialog>
  </>;
}
