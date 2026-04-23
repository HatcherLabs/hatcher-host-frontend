import { redirect } from 'next/navigation';

export default function DashboardRedirect() {
  // The locale prefix is injected by middleware — redirect to the agents sub-route.
  redirect('/dashboard/agents');
}
