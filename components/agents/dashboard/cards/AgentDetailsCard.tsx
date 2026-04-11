'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { GlassCard, FRAMEWORK_BADGE } from '../../AgentContext';

function TechnicalDetails({
  chatEndpoint,
  port,
}: {
  chatEndpoint?: string;
  port?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Technical Details
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[var(--border-default)]">
          <div>
            <span className="text-xs block mb-1 text-[var(--text-muted)]">API Endpoint</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">
              {chatEndpoint ?? 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[var(--text-muted)]">Port</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{port ?? 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Agent Details" card — framework name, docker image, best-for line,
 * and a collapsible technical details section (API endpoint + port).
 * Static metadata from @hatcher/shared's FRAMEWORKS map.
 */
export function AgentDetailsCard({ framework }: { framework: AgentFramework }) {
  const frameworkMeta = FRAMEWORKS[framework];
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold mb-4 text-[var(--text-secondary)]">Agent Details</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <span className="text-xs block mb-1 text-[var(--text-muted)]">Framework</span>
          <span
            className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border ${
              FRAMEWORK_BADGE[framework] ?? ''
            }`}
          >
            {frameworkMeta?.name ?? framework}
          </span>
        </div>
        <div>
          <span className="text-xs block mb-1 text-[var(--text-muted)]">Runtime</span>
          <span className="text-sm text-[var(--text-primary)]">
            {frameworkMeta?.dockerImage ?? 'N/A'}
          </span>
        </div>
        {frameworkMeta?.bestFor && (
          <div className="sm:col-span-2">
            <span className="text-xs block mb-1 text-[var(--text-muted)]">Best For</span>
            <span className="text-sm text-[var(--text-secondary)]">{frameworkMeta.bestFor}</span>
          </div>
        )}

        {/* Collapsible technical details */}
        <div className="sm:col-span-2">
          <TechnicalDetails chatEndpoint={frameworkMeta?.chatEndpoint} port={frameworkMeta?.port} />
        </div>
      </div>
    </GlassCard>
  );
}
