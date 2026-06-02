'use client';
import { useEffect } from 'react';

const SRC = 'https://widget.qwerti.ai/widget/v1/buy.js';

/**
 * Mounts the Qwerti buy widget — landing page only.
 *
 * The third-party script appends its launcher straight to <body>, which then
 * survives client-side navigation and floats over the rest of the app (e.g.
 * overlapping the agent-room chat). This component scopes it to wherever it's
 * mounted: it injects the script on mount and tears the widget's DOM back down
 * on unmount, so leaving the landing page removes it.
 */
export function QwertiWidget() {
  useEffect(() => {
    const tracked = new Set<Element>();
    const isQwerti = (el: Element) => {
      const hay = `${el.id} ${el.className} ${el.getAttribute('data-widget') ?? ''}`;
      if (/qwerti/i.test(hay)) return true;
      if (el.tagName === 'IFRAME' && /qwerti/i.test((el as HTMLIFrameElement).src)) return true;
      return false;
    };

    // Track anything the widget injects so we can remove exactly those nodes,
    // even if it uses an unbranded container.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const el = node as Element;
          if (isQwerti(el) || el.querySelector?.('[id*="qwerti" i],[src*="qwerti" i]')) {
            tracked.add(el);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });

    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.dataset.widget = 'qwerti-widget';
    script.dataset.campaign = 'hatcher-792703809-48487';
    script.dataset.autoOpen = 'false';
    document.body.appendChild(script);

    return () => {
      observer.disconnect();
      script.remove();
      tracked.forEach((el) => el.remove());
      // Belt-and-suspenders sweep for any branded leftovers.
      document
        .querySelectorAll('[id*="qwerti" i],[class*="qwerti" i],[data-widget*="qwerti" i],iframe[src*="qwerti" i]')
        .forEach((el) => el.remove());
    };
  }, []);

  return null;
}
