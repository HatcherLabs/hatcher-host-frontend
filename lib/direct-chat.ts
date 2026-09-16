import { req, getToken } from './api/core';
import { API_URL } from './config';

export interface ChatModel { id: string; name: string; contextLength: number; inputUsd: number; outputUsd: number }
export interface ChatPlan { id: string; name: string; weeklyCredits: number; priceCents: number; currency: string; durationDays: number }
export interface Conversation { id: string; title: string; model: string }
export interface ChatTurn { id: string; prompt: string; response: string; model: string; status: string; creditsCharged: number | null; generationId?: string | null }
export type ChatCreateKind = 'image' | 'video' | 'audio';
export interface ChatCreateTool { id: string; label: string; estimatedAiCredits: number; configured: boolean }
export interface ChatAccount { plans: ChatPlan[]; budget: null | { plan: { planId: string; weeklyCredits: number; endsAt: string }; week: { spent: number; reserved: number; resetsAt: string }; remaining: number }; walletBalance: number; queued: Array<{ id: string; planId: string; startsAt: string }>; autoRenews: boolean }
export async function chatRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const result = await req<T>(`/chat${path}`, options);
  if (!result.success) throw new Error(result.error);
  return result.data;
}
export async function sendChat(id: string, prompt: string, model: string, signal: AbortSignal, onDelta: (text: string) => void, artifactMode?: 'chart') {
  const token = getToken();
  const response = await fetch(`${API_URL}/chat/conversations/${encodeURIComponent(id)}/stream`, {
    method: 'POST', credentials: 'include', signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ requestId: crypto.randomUUID(), prompt, model, ...(artifactMode ? { artifactMode } : {}) }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(error.error ?? 'Unable to send message');
  }
  if (!response.body) throw new Error('No reply stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, boundary).trim(); buffer = buffer.slice(boundary + 1);
        if (!line.startsWith('data:')) continue;
        const event = JSON.parse(line.slice(5)) as { type: string; text?: string; message?: string; status?: string };
        if (event.type === 'delta' && event.text) onDelta(event.text);
        if (event.type === 'error') throw new Error(event.message ?? 'Reply interrupted');
        if (event.type === 'done') {
          finished = true;
          if (event.status !== 'completed') throw new Error(event.status === 'pending_usage' ? 'Reply interrupted. Usage is being reconciled.' : 'Reply interrupted. You can try again.');
        }
      }
    }
    if (!finished) throw new Error('Connection interrupted. Refresh the conversation before retrying.');
  } finally { await reader.cancel().catch(() => undefined); }
}
