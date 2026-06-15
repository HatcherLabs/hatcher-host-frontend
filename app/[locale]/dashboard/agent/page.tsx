import { redirect } from 'next/navigation';

export default function AgentDashboardIndexRedirect() {
  redirect('/dashboard/agents');
}
