import type { Metadata } from 'next';
import { LandingV3 } from '@/components/landing/v3/LandingV3';
import { buildLanguagesMap } from '@/lib/seo';
import { ChatEntry } from '@/components/chat/ChatEntry';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hatcher — AI Agents for Everyday Tasks',
  description:
    'Create your own AI agent for daily planning, emails, messages, market research, and coding. Start with a simple example and make it yours.',
  alternates: { languages: buildLanguagesMap('/') },
};

// The Qwerti widget script is mounted globally by QwertiWidgetGate (root
// layout), which only loads it on this landing route and hides its floating
// UI on every other page.
export default function HomePage() {
  if (process.env.HATCHER_CHAT_ENTRY_ENABLED === 'true') return <ChatEntry />;
  return <LandingV3 />;
}
