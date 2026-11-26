const domains: Record<string, string> = {
  account: 'account profile and usage',
  conversations: 'conversations and messages',
  media: 'Studio images, video and audio',
  agents: 'agents and their configuration',
  files: 'workspace files and knowledge',
  mail: 'agent email',
  orchestration: 'tasks, routines and coordination',
  integrations: 'agent integrations and skills',
  support: 'support tickets',
  billing: 'billing and purchase history',
};
export function operatorScopeCopy(scope: string): { title: string; description: string } {
  if (scope === 'hatcher:read') return { title: 'View agents and API usage', description: 'Read owned agent status and safe metadata.' };
  if (scope === 'hatcher:chat') return { title: 'Contact your agents', description: 'Request an agent conversation, with your approval.' };
  if (scope === 'hatcher:lifecycle') return { title: 'Start, stop and restart agents', description: 'Runtime changes require approval in Hatcher.' };
  const [, domain, access] = scope.split(':');
  const label = domains[domain] ?? domain;
  return access === 'read'
    ? { title: `View ${label}`, description: 'Read data from your connected Hatcher account.' }
    : { title: `Manage ${label}`, description: 'Review and approve each requested change in Hatcher. Usage and credit limits still apply.' };
}
