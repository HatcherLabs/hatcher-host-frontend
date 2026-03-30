(function(){
  var s = document.currentScript;
  if (!s) return;

  var slug = s.getAttribute('data-agent');
  if (!slug) { console.error('[Hatcher] Missing data-agent attribute'); return; }

  var position = s.getAttribute('data-position') || 'right';
  var color = s.getAttribute('data-color') || '#7c3aed';
  var host = s.src.replace(/\/widget\.js.*$/, '');

  // Prevent double init
  if (document.getElementById('hatcher-widget-root')) return;

  var root = document.createElement('div');
  root.id = 'hatcher-widget-root';
  document.body.appendChild(root);

  var css = document.createElement('style');
  css.textContent = [
    '#hatcher-widget-btn{',
      'position:fixed;bottom:20px;' + position + ':20px;',
      'width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
      'background:' + color + ';color:#fff;',
      'box-shadow:0 4px 14px rgba(0,0,0,.35);',
      'z-index:2147483646;display:flex;align-items:center;justify-content:center;',
      'transition:transform .2s,box-shadow .2s;',
    '}',
    '#hatcher-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.45)}',
    '#hatcher-widget-btn svg{width:28px;height:28px;transition:transform .2s}',
    '#hatcher-widget-frame{',
      'position:fixed;bottom:88px;' + position + ':20px;',
      'width:380px;height:520px;max-width:calc(100vw - 32px);max-height:calc(100vh - 110px);',
      'border:none;border-radius:16px;',
      'box-shadow:0 8px 30px rgba(0,0,0,.4);',
      'z-index:2147483645;',
      'opacity:0;transform:translateY(12px) scale(.96);',
      'transition:opacity .25s,transform .25s;pointer-events:none;',
      'background:#0a0a0f;',
    '}',
    '#hatcher-widget-frame.hatcher-open{',
      'opacity:1;transform:translateY(0) scale(1);pointer-events:auto;',
    '}',
    '@media(max-width:440px){',
      '#hatcher-widget-frame{width:calc(100vw - 16px);height:calc(100vh - 100px);',
        position + ':8px;bottom:80px;border-radius:12px;}',
      '#hatcher-widget-btn{bottom:16px;' + position + ':16px;width:50px;height:50px;}',
    '}',
  ].join('');
  root.appendChild(css);

  function makeSvg(paths) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    paths.forEach(function(p) {
      var el;
      if (p.d) {
        el = document.createElementNS(ns, 'path');
        el.setAttribute('d', p.d);
      } else {
        el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', p.x1); el.setAttribute('y1', p.y1);
        el.setAttribute('x2', p.x2); el.setAttribute('y2', p.y2);
      }
      svg.appendChild(el);
    });
    return svg;
  }

  function chatIcon() {
    return makeSvg([{d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'}]);
  }

  function closeIcon() {
    return makeSvg([
      {x1:'18',y1:'6',x2:'6',y2:'18'},
      {x1:'6',y1:'6',x2:'18',y2:'18'}
    ]);
  }

  // Iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'hatcher-widget-frame';
  iframe.src = host + '/embed/' + encodeURIComponent(slug) + '?widget=1';
  iframe.setAttribute('allow', 'microphone');
  iframe.title = 'Chat with AI Agent';
  root.appendChild(iframe);

  // Button
  var btn = document.createElement('button');
  btn.id = 'hatcher-widget-btn';
  btn.appendChild(chatIcon());
  btn.setAttribute('aria-label', 'Open chat');
  var open = false;

  btn.addEventListener('click', function() {
    open = !open;
    iframe.classList.toggle('hatcher-open', open);
    btn.removeChild(btn.firstChild);
    btn.appendChild(open ? closeIcon() : chatIcon());
    btn.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
  });

  root.appendChild(btn);
})();
