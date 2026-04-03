export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  timestamp?: Date;
}

export interface ChatMessageProps {
  msg: ChatMsg;
  isSpeakingThis: boolean;
  ttsSupported: boolean;
  onSpeak: (id: string, content: string) => void;
  agentId: string;
  isAuthenticated: boolean;
  framework: string;
}
