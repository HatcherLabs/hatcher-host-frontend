'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowUp, BarChart3, Check, Copy, Image, LogOut, Menu, Music2, Plus, Square, Trash2, Video, WandSparkles, X } from 'lucide-react';
import { chatRequest, sendChat, type ChatAccount, type ChatCreateKind, type ChatCreateTool, type ChatModel, type ChatTurn, type Conversation } from '@/lib/direct-chat';
import { RichMarkdown } from '@/components/agents/tabs/ChatTab/ArtifactRenderer';
import styles from './page.module.css';

export default function ChatPage() {
  const locale = useLocale();
  const [account, setAccount] = useState<ChatAccount | null>(null);
  const [models, setModels] = useState<ChatModel[]>([]);
  const [chats, setChats] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [model, setModel] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [buying, setBuying] = useState(false);
  const [copied, setCopied] = useState('');
  const [createMode, setCreateMode] = useState<ChatCreateKind | 'chart' | null>(null);
  const [createMenu, setCreateMenu] = useState(false);
  const [createTools, setCreateTools] = useState<ChatCreateTool[]>([]);
  const controller = useRef<AbortController | null>(null);
  const polling = useRef(new Set<string>());
  const selection = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    const [a, c] = await Promise.all([chatRequest<ChatAccount>('/account'), chatRequest<{ conversations: Conversation[] }>('/conversations')]);
    setAccount(a); setChats(c.conversations);
  }, []);
  useEffect(() => {
    let disposed = false;
    Promise.all([chatRequest<ChatAccount>('/account'), chatRequest<{ conversations: Conversation[] }>('/conversations'), chatRequest<{ models: ChatModel[] }>('/models'), chatRequest<{ tools: ChatCreateTool[] }>('/create/config')])
      .then(([a, c, m, tools]) => { if (!disposed) { setAccount(a); setChats(c.conversations); setModels(m.models); setModel(m.models[0]?.id ?? ''); setCreateTools(tools.tools); } })
      .catch(e => { if (!disposed) setError(e.message); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; controller.current?.abort(); };
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns]);
  useEffect(() => {
    const onFocus = () => { if (!controller.current) refresh().catch(() => undefined); };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [refresh]);
  const modelNames = useMemo(() => new Map([...models.map(item => [item.id, item.name] as const), ['market/coingecko', 'CoinGecko'], ['market/dexscreener', 'DexScreener'], ['media/seedream_image', 'Seedream'], ['media/seedance_video', 'Seedance'], ['media/suno_audio', 'Suno']]), [models]);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const open = async (id: string, preserveError = false) => {
    const epoch = ++selection.current;
    if (!preserveError) setError('');
    setSidebar(false);
    try {
      const chat = await chatRequest<Conversation & { turns: ChatTurn[] }>(`/conversations/${id}`);
      if (epoch === selection.current) { setSelected(id); setModel(chat.model); setTurns(chat.turns); }
      return chat;
    } catch (e) { setError((e as Error).message); return null; }
  };
  const pollGeneration = useCallback(async (turnId: string, kind: ChatCreateKind) => {
    if (polling.current.has(turnId)) return;
    polling.current.add(turnId);
    try {
      for (let attempt = 0; attempt < 45; attempt += 1) {
        if (attempt) await new Promise(resolve => window.setTimeout(resolve, 4000));
        const result = await chatRequest<{ turn: ChatTurn; done: boolean }>('/create/status', {
          method: 'POST', body: JSON.stringify({ turnId, kind }),
        });
        setTurns(previous => previous.map(turn => turn.id === turnId ? result.turn : turn));
        if (result.done) { await refresh(); return; }
      }
      setError('Generation is taking longer than expected. It will remain in this conversation; reopen it to check again.');
    } catch (e) { setError((e as Error).message); }
    finally { polling.current.delete(turnId); }
  }, [refresh]);
  useEffect(() => {
    for (const turn of turns) {
      if (turn.status !== 'generating' || !turn.generationId) continue;
      const kind = turn.model.includes('seedream') ? 'image' : turn.model.includes('seedance') ? 'video' : turn.model.includes('suno') ? 'audio' : null;
      if (kind) void pollGeneration(turn.id, kind);
    }
  }, [turns, pollGeneration]);
  const createMedia = async (kind: ChatCreateKind, text: string) => {
    setBusy(true); setError(''); setPrompt('');
    let id = selected;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({ model }) });
        id = chat.id; setSelected(id);
      }
      const result = await chatRequest<{ turn: ChatTurn; done: boolean }>('/create', {
        method: 'POST', body: JSON.stringify({ conversationId: id, kind, prompt: text.trim() }),
      });
      setTurns(previous => [...previous, result.turn]);
      setCreateMode(null);
      await refresh();
      if (!result.done) void pollGeneration(result.turn.id, kind);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const createMarketChart = async (text: string) => {
    setBusy(true); setError(''); setPrompt('');
    let id = selected;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({ model }) });
        id = chat.id; setSelected(id);
      }
      const result = await chatRequest<{ turn: ChatTurn }>('/chart', {
        method: 'POST', body: JSON.stringify({ conversationId: id, prompt: text.trim() }),
      });
      setTurns(previous => [...previous, result.turn]);
      setCreateMode(null);
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const send = async (text = prompt) => {
    if (busy || !text.trim() || !model) return;
    if (createMode && createMode !== 'chart') return void createMedia(createMode, text);
    if (createMode === 'chart') return void createMarketChart(text);
    setBusy(true); setError(''); setPrompt('');
    const abort = new AbortController(); controller.current = abort;
    let id = selected;
    try {
      if (!id) {
        const chat = await chatRequest<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({ model }) });
        id = chat.id; setSelected(id);
      }
      const turn: ChatTurn = { id: 'sending', prompt: text.trim(), response: '', model, status: 'running', creditsCharged: null };
      setTurns(previous => [...previous, turn]);
      await sendChat(id, text.trim(), model, abort.signal, delta => setTurns(previous => previous.map(t => t.id === 'sending' ? { ...t, response: t.response + delta } : t)));
      setCreateMode(null);
    } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
    finally {
      controller.current = null;
      await refresh().catch(() => undefined);
      if (id) {
        for (const delay of [0, 250, 750, 1500]) {
          if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
          const chat = await open(id, true);
          if (!chat?.turns.some(turn => turn.status === 'running')) break;
        }
      }
      setBusy(false);
    }
  };
  const buy = async (planId: string) => {
    setBuying(true); setError('');
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const result = await chatRequest<{ url: string }>('/checkout', { method: 'POST', body: JSON.stringify({ planId, returnUrl }) });
      window.location.assign(result.url);
    }
    catch (e) { setError((e as Error).message); setBuying(false); }
  };
  const budget = account?.budget;
  const used = budget ? Math.min(100, Math.round((budget.week.spent + budget.week.reserved) / budget.plan.weeklyCredits * 1000) / 10) : 0;
  return <main className={styles.shell}>
    <aside className={`${styles.sidebar} ${sidebar ? styles.visible : ''}`} aria-label="Conversations">
      <div className={styles.sideHeader}><strong>Hatcher Chat</strong><button className={styles.mobile} aria-label="Close conversations" onClick={() => setSidebar(false)}><X size={18} /></button></div>
      <button className={styles.newChat} disabled={busy} onClick={() => { ++selection.current; setSelected(null); setTurns([]); setPrompt(''); setError(''); setSidebar(false); }}><Plus size={17} /> New chat</button>
      <div className={styles.history}>{chats.map(chat => <div className={styles.historyRow} key={chat.id}>
        <button aria-current={selected === chat.id ? 'page' : undefined} disabled={busy} onClick={() => void open(chat.id)}>{chat.title}</button>
        <button aria-label={`Delete ${chat.title}`} disabled={busy} onClick={async () => {
          if (!window.confirm('Delete this conversation?')) return;
          try { await chatRequest(`/conversations/${chat.id}`, { method: 'DELETE' }); if (selected === chat.id) { setSelected(null); setTurns([]); } await refresh(); } catch (e) { setError((e as Error).message); }
        }}><Trash2 size={14} /></button>
      </div>)}</div>
      <div className={styles.usage}>
        <strong>{budget ? account?.plans.find(p => p.id === budget.plan.planId)?.name : 'Your Chat plan'}</strong>
        {budget && <><div className={styles.usageLabel}><span>Weekly usage</span><span>{used}%</span></div><progress value={used} max={100} aria-label="Weekly usage" />
          <small>Resets {new Date(budget.week.resetsAt).toLocaleString()}</small>
          {budget.week.reserved > 0 && <small>{numberFormat.format(budget.week.reserved)} credits reserved for replies</small>}
        </>}
        <small>{numberFormat.format(account?.walletBalance ?? 0)} account AI Credits available</small>
        <button onClick={() => setShowPlans(v => !v)}>View plans</button>
        <Link href="/dashboard">Back to Hatcher</Link>
      </div>
    </aside>
    <section className={styles.chat}>
      <header className={styles.header}><button className={styles.mobile} aria-label="Open conversations" onClick={() => setSidebar(true)}><Menu size={20} /></button>
        <select aria-label="Model" value={model} disabled={busy || !models.length} onChange={e => setModel(e.target.value)}>
          {!models.length && <option value="">Models unavailable</option>}
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select><div className={styles.headerActions}><button onClick={() => setShowPlans(v => !v)}>{budget ? `${used}% used` : `${numberFormat.format(account?.walletBalance ?? 0)} credits`}</button><Link href="/dashboard" className={styles.exit} aria-label="Exit"><LogOut size={15} /> <span>Exit</span></Link></div>
      </header>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {showPlans && <section className={styles.plans} aria-label="Chat plans">
        <h2>Choose your Chat plan</h2><p>30 days of access. Weekly usage resets. No automatic renewal.</p>
        <div className={styles.planGrid}>{account?.plans.map(plan => <article key={plan.id}><h3>{plan.name}</h3>
          <strong>{new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(plan.priceCents / 100)} <small>/ 30 days</small></strong>
          <p><strong>{numberFormat.format(plan.weeklyCredits * 5)} credits / 30 days</strong><br />{numberFormat.format(plan.weeklyCredits)} each week · resets every 7 days<br />{plan.id === 'pro' ? '2× more usage than Basic' : plan.id === 'max' ? '5.2× more usage than Basic' : 'Full model selector, history and charts'}</p>
          <ul><li>All available chat models</li><li>Charts and rich artifacts</li><li>Account AI Credits fallback</li></ul><button disabled={buying} onClick={() => void buy(plan.id)}>{buying ? 'Opening checkout…' : budget ? 'Extend access' : 'Get started'}</button>
        </article>)}</div>
        {budget && <p>Purchases start after your current paid access ends. Your current weekly limit stays the same.</p>}
        {account?.queued.map(q => <p key={q.id}>Chat {q.planId} starts {new Date(q.startsAt).toLocaleDateString()}.</p>)}
      </section>}
      <div className={styles.messages} aria-busy={busy}>
        {loading ? <p className={styles.empty}>Loading your chats…</p> : turns.length === 0 ? <div className={styles.empty}><h1>What would you like to explore?</h1><p>Use your Chat plan or account AI Credits with any available model.</p></div> : turns.map(turn => <article className={styles.turn} key={turn.id}>
          <div className={styles.prompt}>{turn.prompt}</div>
          <div className={styles.answer}><RichMarkdown content={turn.response || (turn.status === 'running' ? 'Thinking…' : 'No response received.')} /></div>
          <div className={styles.actions}>
            <span>{modelNames.get(turn.model) ?? turn.model}{turn.creditsCharged !== null ? ` · ${numberFormat.format(turn.creditsCharged)} credits` : ''}</span>
            {turn.status === 'pending_usage' && <span>Usage pending</span>}
            <button aria-label="Copy response" disabled={!turn.response} onClick={async () => { try { await navigator.clipboard.writeText(turn.response); setCopied(turn.id); } catch { setError('Unable to copy response.'); } }}>{copied === turn.id ? <Check size={15} /> : <Copy size={15} />}</button>
            <button disabled={busy} onClick={() => setPrompt(turn.prompt)}>Edit &amp; resend</button>
          </div>
        </article>)}<div ref={end} />
      </div>
      <form className={styles.composer} onSubmit={e => { e.preventDefault(); void send(); }}>
        <div className={styles.createWrap}><button type="button" className={styles.createButton} aria-label="Create" aria-expanded={createMenu} onClick={() => setCreateMenu(value => !value)}><WandSparkles size={18} /></button>{createMenu && <div className={styles.createMenu}>
          {([['image', Image, 'Image'], ['video', Video, 'Video'], ['audio', Music2, 'Audio'], ['chart', BarChart3, 'Market chart']] as const).map(([kind, Icon, label]) => { const toolId = kind === 'image' ? 'seedream_image' : kind === 'video' ? 'seedance_video' : kind === 'audio' ? 'suno_audio' : ''; const tool = createTools.find(item => item.id === toolId); return <button type="button" key={kind} disabled={kind !== 'chart' && !tool?.configured} onClick={() => { setCreateMode(kind); setCreateMenu(false); }}><Icon size={17} /><span><strong>{label}</strong><small>{kind === 'chart' ? 'Live CoinGecko + DexScreener data' : tool?.configured ? `Est. ${numberFormat.format(tool.estimatedAiCredits)} AI Credits` : 'Unavailable'}</small></span></button>; })}
        </div>}</div>
        <div className={styles.composerInput}>{createMode && <div className={styles.modeChip}><span>{createMode === 'chart' ? 'Live market chart' : `Create ${createMode}`}</span><button type="button" aria-label="Clear create mode" onClick={() => setCreateMode(null)}><X size={13} /></button></div>}<textarea aria-label="Message" placeholder={createMode === 'chart' ? 'Bitcoin 30d, $HATCHER 7d, or a token address' : createMode ? `Describe the ${createMode} you want` : 'Message Hatcher Chat'} value={prompt} maxLength={16000} rows={2} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} /></div>
        {busy ? <button type="button" aria-label="Stop response" onClick={() => controller.current?.abort()}><Square size={17} /></button> : <button type="submit" aria-label="Send message" disabled={!prompt.trim() || !model || (!budget && (account?.walletBalance ?? 0) <= 0)}><ArrowUp size={20} /></button>}
      </form><p className={styles.footnote}>AI can make mistakes. Check important information.</p>
    </section>
  </main>;
}
