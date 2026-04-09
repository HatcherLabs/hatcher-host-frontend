'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

export function useAgentActions(
  agent: Agent | null,
  id: string,
  loadAgent: () => Promise<void>,
) {
  const router = useRouter();
  const { toast } = useToast();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAction = useCallback(async (action: 'start' | 'stop' | 'restart') => {
    if (!agent) return;
    setActionLoading(action);
    setActionError(null);
    setActionSuccess(null);
    try {
      let res;
      if (action === 'start') res = await api.startAgent(id);
      else if (action === 'stop') res = await api.stopAgent(id);
      else if (action === 'restart') res = await api.restartAgent(id);
      if (res && !res.success) {
        toast.error(`Failed to ${action} agent: ${res.error ?? 'Unknown error'}`);
      } else if (res?.success) {
        const labels = { start: 'started', stop: 'stopped', restart: 'restarted' };
        toast.success(`Agent ${labels[action]} successfully`);
      }
    } catch {
      toast.error(`Failed to ${action} agent. Check your connection.`);
    }
    await loadAgent();
    setActionLoading(null);
  }, [agent, id, loadAgent, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    setDeleteError(null);
    const res = await api.deleteAgent(id);
    if (res.success) {
      router.push('/dashboard/agents');
    } else {
      setDeleting(false);
      setDeleteConfirm(false);
      setDeleteError(res.error ?? 'Failed to delete agent. Please try again.');
    }
  }, [deleteConfirm, id, router]);

  return {
    actionLoading,
    actionError, setActionError,
    actionSuccess,
    deleteConfirm, setDeleteConfirm,
    deleting,
    deleteError, setDeleteError,
    handleAction,
    handleDelete,
  };
}
