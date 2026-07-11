import { describe, expect, it } from 'vitest';
import {
  canApproveMissionTask,
  canCancelMissionTask,
  canResumeMissionTask,
  canStartMissionTask,
  missionOutputText,
  missionTaskProgress,
  normalizeMissionTask,
  normalizeMissionTaskList,
  safeMissionArtifactUrl,
} from '../lib/mission-control';

describe('Mission Control DTO mapping', () => {
  it('normalizes optional nested task data without crashing', () => {
    const task = normalizeMissionTask({
      id: 'task-1',
      agentId: 'agent-1',
      title: 'Prepare launch brief',
      prompt: 'Research and draft the brief.',
      status: 'running',
      requiresApproval: true,
      budget: { aiCredits: 250 },
      latestRun: {
        id: 'run-1',
        attempt: 2,
        status: 'running',
        createdAt: '2026-07-11T10:00:00.000Z',
        events: [{ type: 'progress', progress: 0.42, message: 'Reviewing sources' }],
      },
    });

    expect(task.agentId).toBe('agent-1');
    expect(task.budget.aiCredits).toBe(250);
    expect(task.artifacts).toEqual([]);
    expect(task.approvals).toEqual([]);
    expect(missionTaskProgress(task)).toEqual({ value: 42, message: 'Reviewing sources' });
    expect(canCancelMissionTask(task)).toBe(true);
  });

  it('uses task-derived summary values when the API summary is absent', () => {
    const result = normalizeMissionTaskList({
      tasks: [
        { id: '1', agentId: 'a', title: 'A', prompt: 'A', status: 'running' },
        { id: '2', agentId: 'a', title: 'B', prompt: 'B', status: 'pending_approval' },
        { id: '3', agentId: 'a', title: 'C', prompt: 'C', status: 'completed' },
      ],
    });

    expect(result.summary).toMatchObject({
      total: 3,
      active: 1,
      awaitingApproval: 1,
      completed: 1,
    });
  });

  it('prefers owner-wide byStatus counts from the API summary', () => {
    const result = normalizeMissionTaskList({
      tasks: [{ id: 'visible', agentId: 'a', title: 'Visible', status: 'running' }],
      summary: {
        total: 19,
        active: 4,
        needsAttention: 5,
        byStatus: { pending_approval: 3, completed: 7, failed: 2, cancelled: 1 },
      },
    });

    expect(result.summary).toMatchObject({
      total: 19,
      active: 4,
      awaitingApproval: 3,
      completed: 7,
      failed: 2,
      cancelled: 1,
      needsAttention: 5,
    });
  });

  it('keeps action semantics explicit, with resume creating only a new attempt', () => {
    const ready = normalizeMissionTask({ status: 'ready' });
    const approval = normalizeMissionTask({ status: 'pending_approval' });
    const failed = normalizeMissionTask({ status: 'failed' });

    expect(canStartMissionTask(ready)).toBe(true);
    expect(canApproveMissionTask(approval)).toBe(true);
    expect(canResumeMissionTask(failed)).toBe(true);
    expect(canStartMissionTask(failed)).toBe(false);
  });

  it('preserves Outcome Pack metadata and gates start until required skills are installed', () => {
    const pending = normalizeMissionTask({
      id: 'task-outcome',
      status: 'ready',
      source: 'outcome_pack',
      sourceId: 'research-report-v1',
      sourceVersion: '1.0.0',
      acceptanceChecks: [{ type: 'artifact_required', artifactKind: 'text' }],
      scheduleTemplates: [{ id: 'daily', enabled: false }],
      outcomePackSkillReadiness: {
        required: true,
        ready: false,
        skills: [{ name: 'in-depth-research', status: 'pending', installed: false }],
      },
    });

    expect(pending).toMatchObject({
      sourceId: 'research-report-v1',
      sourceVersion: '1.0.0',
      acceptanceChecks: [{ type: 'artifact_required' }],
      scheduleTemplates: [{ enabled: false }],
    });
    expect(canStartMissionTask(pending)).toBe(false);
    expect(canStartMissionTask({
      ...pending,
      outcomePackSkillReadiness: {
        required: true,
        ready: true,
        skills: [{ name: 'in-depth-research', status: 'installed', installed: true }],
      },
    })).toBe(true);
  });

  it('does not offer cancel again after cancellation was requested', () => {
    const task = normalizeMissionTask({
      status: 'running',
      latestRun: {
        id: 'run-1',
        attempt: 1,
        status: 'running',
        cancelRequestedAt: '2026-07-11T10:01:00.000Z',
        createdAt: '2026-07-11T10:00:00.000Z',
      },
    });

    expect(canCancelMissionTask(task)).toBe(false);
  });

  it('formats structured output for the operational detail panel', () => {
    expect(missionOutputText({ result: 'done', count: 2 })).toBe(
      '{\n  "result": "done",\n  "count": 2\n}',
    );
    expect(missionOutputText(null)).toBeNull();
  });

  it('allows only HTTP(S) artifact links', () => {
    expect(safeMissionArtifactUrl('https://files.example.com/report.pdf')).toBe(
      'https://files.example.com/report.pdf',
    );
    expect(safeMissionArtifactUrl('javascript:alert(1)')).toBeNull();
    expect(safeMissionArtifactUrl('/internal/report')).toBeNull();
    expect(safeMissionArtifactUrl('file:///tmp/report')).toBeNull();
  });
});
