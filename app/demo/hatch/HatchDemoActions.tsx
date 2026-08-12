'use client';

import { ArrowRight } from 'lucide-react';

export function HatchDemoActions({ agent, label }: { agent: string; label: string }) {
  function openHatch() {
    window.dispatchEvent(
      new CustomEvent('hatcher:embed:open', {
        detail: { agent },
      })
    );
  }

  return (
    <button type="button" onClick={openHatch} className="hatch-demo-primary-action">
      {label}
      <ArrowRight aria-hidden="true" />
    </button>
  );
}
