import ChatWorkspace from '@/components/chat/ChatWorkspace';
export const dynamic = 'force-dynamic';
export default function ChatPage() { return <ChatWorkspace agentsEnabled={process.env.HATCHER_CHAT_ENTRY_ENABLED === 'true'} />; }
