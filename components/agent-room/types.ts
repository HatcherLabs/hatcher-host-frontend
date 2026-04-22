export interface RoomAgent {
  id: string;
  slug: string;
  name: string;
  framework: string;
  template?: string;
  status: string;
  messageCount: number;
  createdAt: string;
  tier?: string;
  isPublic?: boolean;
  avatarUrl?: string | null;
}

export interface RoomIntegration {
  key: string;
  label: string;
  colorHex: string;
  active: boolean;
}

export interface RoomSkill {
  key: string;
  label: string;
  icon: string;
  active: boolean;
  calls?: number;
}

export interface RoomLogLine {
  time: string;
  level: 'info' | 'tool' | 'ok' | 'llm' | 'error' | 'warn';
  text: string;
}
