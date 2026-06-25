import type { ChatMessageToolEvent } from './chatToolEvents';
import type { ChatMessageThinkingState } from './chatThinkingEvents';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  timestamp?: Date;
  toolEvents?: ChatMessageToolEvent[];
  thinking?: ChatMessageThinkingState;
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
