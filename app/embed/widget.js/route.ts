const WIDGET_SOURCE = String.raw`(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement) || script.dataset.hatcherMounted === 'true') return;
  script.dataset.hatcherMounted = 'true';

  const agent = (script.dataset.agent || '').trim();
  if (!agent) {
    console.warn('[Hatcher] Embedded agent widget requires data-agent.');
    return;
  }

  const allowedTheme = new Set(['auto', 'light', 'dark']);
  const allowedAccent = new Set(['green', 'blue', 'purple']);
  const allowedPosition = new Set(['right', 'left']);
  const theme = allowedTheme.has(script.dataset.theme || '') ? script.dataset.theme : 'auto';
  const accent = allowedAccent.has(script.dataset.accent || '') ? script.dataset.accent : 'green';
  const position = allowedPosition.has(script.dataset.position || '') ? script.dataset.position : 'right';
  const colors = { green: '#00e676', blue: '#3b82f6', purple: '#8b5cf6' };
  const color = colors[accent];
  const origin = new URL(script.src, window.location.href).origin;
  const url = new URL('/embed/agent/' + encodeURIComponent(agent), origin);
  url.searchParams.set('theme', theme);
  url.searchParams.set('accent', accent);
  url.searchParams.set('widget', '1');

  const root = document.createElement('div');
  root.dataset.hatcherAgentWidget = agent;
  root.style.cssText = 'position:fixed;z-index:2147483000;bottom:20px;' + position + ':20px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Chat with this Hatcher agent');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.style.cssText = 'display:flex;align-items:center;gap:10px;min-height:52px;padding:0 18px;border:0;border-radius:999px;background:' + color + ';color:' + (accent === 'green' ? '#07110b' : '#fff') + ';box-shadow:0 16px 45px rgba(0,0,0,.28);cursor:pointer;font:600 14px/1 Inter,ui-sans-serif,system-ui;';

  const mark = document.createElement('span');
  mark.textContent = 'H';
  mark.setAttribute('aria-hidden', 'true');
  mark.style.cssText = 'display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:rgba(0,0,0,.16);font:800 15px/1 ui-monospace,SFMono-Regular,Menlo,monospace;';
  const label = document.createElement('span');
  label.textContent = script.dataset.label || 'Chat with agent';
  launcher.append(mark, label);

  const panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:relative;width:min(390px,calc(100vw - 24px));height:min(640px,calc(100vh - 96px));overflow:hidden;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:#0b0d0c;box-shadow:0 24px 80px rgba(0,0,0,.38);';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close agent chat');
  close.style.cssText = 'position:absolute;z-index:2;top:10px;right:10px;display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(148,163,184,.22);border-radius:10px;background:rgba(11,13,12,.86);color:#e5e7eb;cursor:pointer;font:400 24px/1 system-ui;backdrop-filter:blur(10px);';

  let frame = null;
  const ensureFrame = () => {
    if (frame) return frame;
    frame = document.createElement('iframe');
    frame.src = url.toString();
    frame.title = 'Hatcher agent chat';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'clipboard-write';
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#0b0d0c;';
    panel.prepend(frame);
    return frame;
  };

  const setOpen = (open) => {
    if (open) ensureFrame();
    panel.style.display = open ? 'block' : 'none';
    launcher.style.display = open ? 'none' : 'flex';
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  launcher.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  window.addEventListener('message', (event) => {
    if (event.origin !== origin || !frame || event.source !== frame.contentWindow) return;
    if (event.data && event.data.type === 'hatcher:embed:close') setOpen(false);
  });

  panel.append(close);
  root.append(panel, launcher);
  document.body.append(root);
})();`;

export function GET() {
  return new Response(WIDGET_SOURCE, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
