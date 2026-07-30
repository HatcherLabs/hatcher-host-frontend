'use client';

import { useEffect, useState } from 'react';

/**
 * Whether this document is rendered inside an iframe (`window.self !==
 * window.top`). Under the sitewide SAMEORIGIN framing policy only our own
 * pages can frame our own pages — the agent desktop's Settings window does
 * exactly that with the dashboard page — so framed documents hide the site
 * chrome (nav, footer, dashboard tab row) and show content only.
 *
 * SSR and the first client paint render unframed (false); the effect flips
 * the flag right after mount. Rendering the fallback first keeps server and
 * client markup identical, avoiding a hydration mismatch.
 */
export function useIsFramed(): boolean {
  const [framed, setFramed] = useState(false);
  useEffect(() => {
    setFramed(window.self !== window.top);
  }, []);
  return framed;
}
