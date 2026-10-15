import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { LandingV3 } from '@/components/landing/v3/LandingV3';
import { ChatEntry } from '@/components/chat/ChatEntry';
export const dynamic = 'force-dynamic';

const pageMetadata: Metadata = {
  title: 'Hatcher — Chat, Agents & Canvas',
  description:
    'Start with a chat, work with your own AI agents, and create images, video and music in Canvas. One Hatcher workspace with shared AI Credits.',
};

// The Qwerti widget script is mounted globally by QwertiWidgetGate (root
// layout), which only loads it on this landing route and hides its floating
// UI on every other page.
export default function HomePage() {
  if (process.env.HATCHER_CHAT_ENTRY_ENABLED === 'true') return <ChatEntry />;
  return <LandingV3 />;
}

export const generateMetadata = localizedMetadata('/', pageMetadata);
