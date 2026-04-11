'use client';

// ============================================================
// OverviewTab — compatibility re-export
//
// The agent dashboard was extracted into per-framework components
// in Etapa 1 of the dashboards refactor (see docs/superpowers/plans/
// 2026-04-10-dashboards-research.md). The real implementation now
// lives under `components/agents/dashboard/`:
//
//   DashboardTab                  — framework switch, defaults to
//                                   GenericDashboard for unknown or
//                                   not-yet-implemented frameworks
//   GenericDashboard              — previous OverviewTab layout,
//                                   composed from the shared cards
//   cards/*                        — HealthPerformanceCard,
//                                    ActivityFeedCard, ...
//   primitives/ResourceBar         — shared UI primitive
//
// This file exists so that the dynamic import in
// `app/dashboard/agent/[id]/page.tsx` keeps working unchanged.
// It can be deleted in a later cleanup commit once the page is
// updated to import from `@/components/agents/dashboard`.
// ============================================================

export { DashboardTab as OverviewTab } from '../dashboard/DashboardTab';
