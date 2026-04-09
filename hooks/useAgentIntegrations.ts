'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import type { IntegrationDef } from '@/components/agents/AgentContext';
import { integrationStateKey } from '@/components/agents/AgentContext';

const CHANNEL_TO_FEATURE: Record<string, string> = {
  telegram: 'openclaw.platform.telegram',
  discord: 'openclaw.platform.discord',
  slack: 'openclaw.platform.slack',
  whatsapp: 'openclaw.platform.whatsapp',
  twitter: 'openclaw.platform.twitter',
  xurl: 'openclaw.platform.twitter',
  signal: 'openclaw.platform.signal',
  irc: 'openclaw.platform.irc',
  matrix: 'openclaw.platform.matrix',
};

export function useAgentIntegrations(
  agent: Agent | null,
  id: string,
  setAgent: (agent: Agent) => void,
) {
  const [integrationSecrets, setIntegrationSecrets] = useState<Record<string, Record<string, string>>>({});
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [savingIntegration, setSavingIntegration] = useState<string | null>(null);
  const [integrationSaveMsg, setIntegrationSaveMsg] = useState<Record<string, string>>({});

  // Pre-populate channel settings from agent config
  useEffect(() => {
    if (!agent) return;
    const config = (agent.config ?? {}) as Record<string, unknown>;
    const cs = config.channelSettings as Record<string, Record<string, unknown>> | undefined;
    if (!cs || typeof cs !== 'object') return;
    setIntegrationSecrets((prev) => {
      const next = { ...prev };
      for (const [channel, settings] of Object.entries(cs)) {
        if (!settings || typeof settings !== 'object') continue;
        const sk = CHANNEL_TO_FEATURE[channel.toLowerCase()] ?? channel.toLowerCase();
        const mapped: Record<string, string> = {};
        if (settings.dmPolicy) mapped._CS_DM_POLICY = String(settings.dmPolicy);
        if (settings.groupPolicy) mapped._CS_GROUP_POLICY = String(settings.groupPolicy);
        if (settings.streaming) mapped._CS_STREAMING = String(settings.streaming);
        if (Array.isArray(settings.allowFrom)) mapped._CS_DM_ALLOWLIST = settings.allowFrom.join(', ');
        if (Array.isArray(settings.groupAllowFrom)) mapped._CS_GROUP_ALLOWLIST = settings.groupAllowFrom.join(', ');
        if (Object.keys(mapped).length > 0) {
          next[sk] = { ...(next[sk] ?? {}), ...mapped };
        }
      }
      return next;
    });
  }, [agent]);

  const toggleIntegrationExpanded = useCallback((featureKey: string) => {
    setExpandedIntegrations((prev) => {
      const next = new Set(prev);
      if (next.has(featureKey)) next.delete(featureKey);
      else next.add(featureKey);
      return next;
    });
  }, []);

  const toggleFieldVisibility = useCallback((fieldKey: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  }, []);

  const setIntegrationField = useCallback((featureKey: string, fieldKey: string, value: string) => {
    setIntegrationSecrets((prev) => ({
      ...prev,
      [featureKey]: {
        ...(prev[featureKey] ?? {}),
        [fieldKey]: value,
      },
    }));
  }, []);

  const hasExistingSecret = useCallback((secretKey: string): boolean => {
    if (!agent) return false;
    const config = (agent.config ?? {}) as Record<string, unknown>;
    return !!(config as Record<string, string>)[secretKey];
  }, [agent]);

  const saveIntegrationSecrets = useCallback(async (integration: IntegrationDef) => {
    if (!agent) return;
    const sk = integrationStateKey(integration);
    setSavingIntegration(sk);
    setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' }));

    const secrets = integrationSecrets[sk] ?? {};
    const filteredSecrets: Record<string, string> = {};
    const channelSettingsUpdate: Record<string, string> = {};
    for (const [k, v] of Object.entries(secrets)) {
      if (!v || !v.trim()) continue;
      if (k.startsWith('_CS_')) {
        channelSettingsUpdate[k] = v.trim();
      } else {
        filteredSecrets[k] = v.trim();
      }
    }

    const missingRequired = integration.fields
      .filter((f) => f.required && !filteredSecrets[f.key] && !hasExistingSecret(f.key))
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({
        ...prev,
        [sk]: `Missing required: ${missingRequired.join(', ')}`,
      }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 5000);
      return;
    }

    const hasSecrets = Object.keys(filteredSecrets).length > 0;
    const hasSettings = Object.keys(channelSettingsUpdate).length > 0;

    if (!hasSecrets && !hasSettings) {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: 'No new values to save' }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 3000);
      return;
    }

    let channelSettingsMerge: Record<string, unknown> = {};
    if (hasSettings) {
      const channelName = integration.secretPrefix.toLowerCase();
      const mapped: Record<string, unknown> = {};
      if (channelSettingsUpdate._CS_DM_POLICY) mapped.dmPolicy = channelSettingsUpdate._CS_DM_POLICY;
      if (channelSettingsUpdate._CS_GROUP_POLICY) mapped.groupPolicy = channelSettingsUpdate._CS_GROUP_POLICY;
      if (channelSettingsUpdate._CS_STREAMING) mapped.streaming = channelSettingsUpdate._CS_STREAMING;
      if (channelSettingsUpdate._CS_DM_ALLOWLIST) {
        mapped.allowFrom = channelSettingsUpdate._CS_DM_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (channelSettingsUpdate._CS_GROUP_ALLOWLIST) {
        mapped.groupAllowFrom = channelSettingsUpdate._CS_GROUP_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean);
      }
      channelSettingsMerge = {
        channelSettings: {
          [channelName]: mapped,
        },
      };
    }

    const updateData: Record<string, unknown> = {
      config: {
        ...filteredSecrets,
        ...channelSettingsMerge,
      },
    };

    try {
      const res = await api.updateAgent(id, updateData as Parameters<typeof api.updateAgent>[1]);
      setSavingIntegration(null);
      if (res.success) {
        setAgent(res.data);
        setIntegrationSecrets((prev) => ({ ...prev, [sk]: {} }));
        const restartNote = (res.data as unknown as Record<string, unknown>)?.restarted
          ? ' — container restarting with new config'
          : '';
        setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: `Credentials saved and encrypted${restartNote}` }));
        setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 5000);
      } else {
        setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: 'Error: ' + res.error }));
      }
    } catch {
      setSavingIntegration(null);
      setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: 'Failed to save credentials. Check your connection.' }));
      setTimeout(() => setIntegrationSaveMsg((prev) => ({ ...prev, [sk]: '' })), 5000);
    }
  }, [agent, id, integrationSecrets, hasExistingSecret, setAgent]);

  return {
    integrationSecrets,
    expandedIntegrations,
    visibleFields,
    savingIntegration,
    integrationSaveMsg,
    toggleIntegrationExpanded,
    toggleFieldVisibility,
    setIntegrationField,
    saveIntegrationSecrets,
    hasExistingSecret,
  };
}
