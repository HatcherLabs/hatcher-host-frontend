import type { Tab } from './AgentContext';

export function shouldMountTerminalTab(activeTab: Tab, wasMounted: boolean): boolean {
  return wasMounted || activeTab === 'terminal';
}
