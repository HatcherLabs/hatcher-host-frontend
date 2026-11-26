import { API_URL } from './config';

export type BrowserAction = 'register' | 'create_agent' | 'oauth';
export class BrowserAdmissionError extends Error {}
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
let scriptLoading: Promise<void> | null = null;
let active = false;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoading) scriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const timer = window.setTimeout(() => { script.remove(); scriptLoading = null; reject(new BrowserAdmissionError('Security check could not load. Please try again.')); }, 20000);
    script.onload = () => { window.clearTimeout(timer); resolve(); };
    script.onerror = () => { window.clearTimeout(timer); script.remove(); scriptLoading = null; reject(new BrowserAdmissionError('Security check could not load. Please try again.')); };
    document.head.appendChild(script);
  });
  return scriptLoading;
}
function challenge(siteKey: string, action: BrowserAction): Promise<string> {
  return new Promise((resolve, reject) => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'hatcher-security-title');
    dialog.style.cssText = 'border:1px solid var(--border-default,#d4d4d8);border-radius:16px;padding:24px;background:var(--bg-card,#fff);color:var(--text-primary,#18181b);max-width:calc(100vw - 32px);box-shadow:0 20px 80px #0006;';
    const title = document.createElement('h2'); title.id = 'hatcher-security-title'; title.textContent = 'Security check'; title.style.cssText = 'font-size:18px;font-weight:600;margin:0 0 8px';
    const description = document.createElement('p'); description.textContent = 'Please complete this check to continue.'; description.style.cssText = 'font-size:14px;margin:0 0 16px';
    const widget = document.createElement('div');
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.style.cssText = 'display:block;margin-top:16px;padding:8px 14px;border:1px solid var(--border-default,#d4d4d8);border-radius:8px;cursor:pointer';
    dialog.append(title, description, widget, cancel); document.body.appendChild(dialog); dialog.showModal();
    let widgetId: string | undefined; let settled = false;
    const timer = window.setTimeout(() => finish(undefined, 'Security check expired. Please try again.'), 120000);
    function finish(token?: string, error?: string) {
      if (settled) return; settled = true; window.clearTimeout(timer);
      if (widgetId) window.turnstile?.remove(widgetId);
      dialog.close(); dialog.remove(); previousFocus?.focus();
      if (token) resolve(token); else reject(new BrowserAdmissionError(error ?? 'Security check cancelled.'));
    }
    cancel.onclick = () => finish(); dialog.oncancel = (event) => { event.preventDefault(); finish(); };
    try {
      if (!window.turnstile) throw new Error('Turnstile unavailable');
      widgetId = window.turnstile.render(widget, {
        sitekey: siteKey, action, theme: 'auto', size: window.innerWidth < 400 ? 'compact' : 'normal',
        callback: (token: string) => finish(token),
        'error-callback': () => finish(undefined, 'Security check failed. Please try again.'),
        'expired-callback': () => finish(undefined, 'Security check expired. Please try again.'),
      });
    } catch { finish(undefined, 'Security check could not start. Please try again.'); }
  });
}
export function admissionAction(path: string, method = 'GET'): BrowserAction | null {
  if (method.toUpperCase() !== 'POST') return null;
  const pathname = path.split('?')[0].replace(/\/$/, '');
  if (pathname === '/auth/register') return 'register';
  if (pathname === '/agents' || pathname === '/agents/import' || pathname === '/agents/from-config' || /^\/agents\/[^/]+\/port$/.test(pathname) || /^\/agents\/backups\/[^/]+\/restore$/.test(pathname)) return 'create_agent';
  return null;
}
export async function ensureBrowserAdmission(action: BrowserAction): Promise<void> {
  if (typeof window === 'undefined') throw new BrowserAdmissionError('Please use the Hatcher web interface.');
  if (active) throw new BrowserAdmissionError('Please finish the current security check first.');
  active = true;
  try {
    const response = await fetch(API_URL + '/auth/browser-admission', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new BrowserAdmissionError('Security verification is temporarily unavailable.');
    const config = await response.json() as { success?: boolean; data?: { enabled: boolean; siteKey: string } };
    if (!config.success || !config.data) throw new BrowserAdmissionError('Security verification is temporarily unavailable.');
    if (!config.data.enabled) return;
    if (!config.data.siteKey) throw new BrowserAdmissionError('Security verification is temporarily unavailable.');
    await loadTurnstile();
    const token = await challenge(config.data.siteKey, action);
    const result = await fetch(API_URL + '/auth/browser-admission', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token }),
    });
    const data = await result.json() as { success?: boolean; error?: string };
    if (!result.ok || !data.success) throw new BrowserAdmissionError(data.error ?? 'Security verification failed. Please try again.');
  } finally { active = false; }
}
