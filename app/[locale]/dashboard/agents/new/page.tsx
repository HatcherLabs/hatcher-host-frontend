import { redirect } from 'next/navigation';

export default function LegacyNewAgentPage() {
  redirect('/create/template');
}
