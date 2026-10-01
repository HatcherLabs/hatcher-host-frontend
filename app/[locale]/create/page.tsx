import { ChatToHatch } from '@/components/chat-to-hatch/ChatToHatch';
import { resolveAgentExample } from '@/lib/agent-examples';

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string | string[] }>;
}) {
  const example = resolveAgentExample((await searchParams).example);
  return <ChatToHatch key={example ?? 'blank'} example={example} />;
}
