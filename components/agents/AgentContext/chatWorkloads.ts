import type { Tab } from './types';

export function shouldRunChatWorkloads(tab: Tab): boolean {
  return tab === 'chat';
}
