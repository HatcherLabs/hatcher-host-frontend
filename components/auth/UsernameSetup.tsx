'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import styles from './UsernameSetup.module.css';

export function UsernameSetup() {
  const { user, isLoading, refreshUser, logout } = useAuth();
  const t = useTranslations('usernameSetup');
  const dialog = useRef<HTMLDialogElement>(null);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [completedUserId, setCompletedUserId] = useState<string | null>(null);
  const needed = !isLoading && Boolean(user?.needsUsername) && completedUserId !== user?.id;

  useEffect(() => {
    if (needed && !dialog.current?.open) dialog.current?.showModal();
    if (!needed && dialog.current?.open) dialog.current.close();
  }, [needed]);
  useEffect(() => { setUsername(''); setError(''); }, [user?.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const selected = username.trim();
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(selected)) { setError(t('format')); return; }
    setBusy(true);
    setError('');
    try {
      const response = await api.updateProfile({ username: selected });
      if (!response.success) { setError(response.error || t('failed')); return; }
      setCompletedUserId(user?.id ?? null);
      await refreshUser();
    } catch { setError(t('failed')); }
    finally { setBusy(false); }
  };
  return (
    <dialog ref={dialog} className={styles.dialog} onCancel={event => event.preventDefault()}
      aria-labelledby="username-setup-title" aria-describedby="username-setup-description">
      <form onSubmit={submit} className={styles.form}>
        <span className={styles.eyebrow}>Hatcher</span>
        <h2 id="username-setup-title">{t('title')}</h2>
        <p id="username-setup-description">{t('description')}</p>
        <label htmlFor="setup-username">{t('label')}</label>
        <input id="setup-username" value={username} onChange={event => setUsername(event.target.value)}
          autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={30}
          pattern="[a-zA-Z0-9_-]{3,30}" required disabled={busy} aria-describedby="username-format" />
        <small id="username-format">{t('format')}</small>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? t('saving') : t('continue')}</button>
        <button type="button" className={styles.signout} disabled={busy} onClick={() => void logout()}>{t('signout')}</button>
      </form>
    </dialog>
  );
}
