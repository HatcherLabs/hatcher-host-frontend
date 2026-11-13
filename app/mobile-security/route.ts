import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') ?? '';
  const state = request.nextUrl.searchParams.get('state') ?? '';
  const nonce = request.headers.get('x-nonce') ?? '';
  if (!['register', 'create_agent', 'oauth'].includes(action) || !/^[a-f0-9-]{32,64}$/.test(state) || !/^[A-Za-z0-9+/=_-]+$/.test(nonce)) return new Response('Invalid security request', { status: 400 });
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Hatcher security check</title><style nonce="${nonce}">body{font:16px system-ui;background:#fff;color:#18181b;margin:0;padding:24px}h1{font-size:22px}#check{min-height:80px}button{padding:12px 20px;margin-top:16px}p{line-height:1.5}</style></head><body><h1>Security check</h1><p id="status">Please complete this check to continue in Hatcher.</p><div id="check"></div><button id="retry" hidden>Try again</button><script nonce="${nonce}">
  const action=${JSON.stringify(action)},state=${JSON.stringify(state)};
  const status=document.getElementById('status'),retry=document.getElementById('retry');
  retry.onclick=()=>location.reload();
  function fail(){status.textContent='The security check could not finish. Please try again.';retry.hidden=false;}
  function complete(token){
    const message=JSON.stringify({token,action,state});
    if(window.HatcherSecurity) window.HatcherSecurity.postMessage(message);
    else if(window.webkit?.messageHandlers?.HatcherSecurity) window.webkit.messageHandlers.HatcherSecurity.postMessage(message);
    else {fail();return;}
    status.textContent='Verified. Returning to Hatcher…';
  }
  (async()=>{try{
    const response=await fetch('https://api.hatcher.host/auth/browser-admission',{cache:'no-store'});
    if(!response.ok)throw Error();const data=await response.json();if(!data.data?.siteKey)throw Error();
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.onerror=fail;script.onload=()=>window.turnstile.render('#check',{sitekey:data.data.siteKey,action,theme:'light',size:innerWidth<360?'compact':'normal',callback:complete,'error-callback':fail,'expired-callback':fail});document.head.appendChild(script);
  }catch{fail();}})();
  </script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
