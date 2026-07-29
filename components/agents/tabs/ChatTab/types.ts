import type { ChatMessageToolEvent } from './chatToolEvents';
import type { ChatMessageThinkingState } from './chatThinkingEvents';

/** AI credit cost of one finished assistant turn. Server-authoritative:
 *  absent when the turn used no hosted credits (BYOK agents etc.). */
export interface ChatMessageUsage {
  credits: number;
  inputTokens: number;
  outputTokens: number;
  /** Model id that produced the reply (max 128 chars); absent when unknown. */
  model?: string;
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  timestamp?: Date;
  toolEvents?: ChatMessageToolEvent[];
  thinking?: ChatMessageThinkingState;
  usage?: ChatMessageUsage;
}

export interface ChatMessageProps {
  msg: ChatMsg;
  isSpeakingThis: boolean;
  ttsSupported: boolean;
  onSpeak: (id: string, content: string) => void;
  agentId: string;
  isAuthenticated: boolean;
  framework: string;
  showThinking: boolean;
  showToolCalls: boolean;
}
