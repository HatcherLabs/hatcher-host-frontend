# Framework Update Checklist

When updating or adding a framework, check ALL of these locations:

## Color Definition (canonical source)
- [ ] `components/agents/AgentContext.tsx` — `FRAMEWORK_BADGE` (canonical color map)

## Frontend - Colors must match canonical
- [ ] `app/explore/page.tsx` — `FRAMEWORK_COLORS`
- [ ] `app/frameworks/page.tsx` — FRAMEWORKS array (hex colors)
- [ ] `app/admin/page.tsx` — `FRAMEWORK_META`
- [ ] `app/dashboard/agents/page.tsx` — `FRAMEWORK_BADGE_STYLES` + `FRAMEWORK_LABELS`
- [ ] `components/agents/tabs/OverviewTab.tsx` — `FRAMEWORK_CAP_STYLE`, `FRAMEWORK_STAT_COLOR`, `FRAMEWORK_CAPABILITIES`, `FRAMEWORK_STATS`

## Frontend - Tab-level framework configs
- [ ] `components/agents/tabs/ConfigTab.tsx` — framework-specific advanced settings sections
- [ ] `components/agents/tabs/ChatTab.tsx` — `FRAMEWORK_BUBBLE`
- [ ] `components/agents/tabs/SkillsTab.tsx` — `FRAMEWORK_SKILL_INFO`
- [ ] `components/agents/tabs/LogsTab.tsx` — framework log format banner
- [ ] `components/agents/tabs/IntegrationsTab.tsx` — `FRAMEWORK_COMPAT`, `FRAMEWORK_RECOMMENDED`
- [ ] `components/agents/tabs/MemoryTab.tsx` — framework memory info
- [ ] `components/agents/tabs/HealthTab.tsx` — `FRAMEWORK_COLORS` (runtime info)
- [ ] `components/agents/tabs/StatsTab.tsx` — `FRAMEWORK_THEME`
- [ ] `components/agents/tabs/UsageTab.tsx` — `FRAMEWORK_CONTEXT`
- [ ] `components/agents/tabs/KnowledgeTab.tsx` — `FRAMEWORK_COLORS`
- [ ] `components/agents/tabs/FilesTab.tsx` — `FRAMEWORK_FS_INFO`, `FRAMEWORK_ACCENT`
- [ ] `components/agents/tabs/SchedulesTab.tsx` — framework compatibility
- [ ] `components/agents/tabs/WorkflowsTab.tsx` — `FRAMEWORK_WORKFLOW_SUPPORT`
- [ ] `components/agents/tabs/VersionsTab.tsx` — `FRAMEWORK_COLORS`
- [ ] `components/agents/tabs/AnalyticsTab.tsx` — `FRAMEWORK_THEME`

## Shared Package
- [ ] `packages/shared/src/constants/index.ts` — `FRAMEWORKS` map
- [ ] `packages/shared/src/types/index.ts` — `AgentFramework` type

## Backend
- [ ] `apps/api/src/adapters/<framework>.ts` — adapter implementation
- [ ] `apps/api/src/services/container-lifecycle.ts` — build/start logic
- [ ] Docker image: `apps/api-repo/docker/<framework>/`

## Templates
- [ ] Template definitions in shared package or API

## Docs
- [ ] Framework docs at docs site
