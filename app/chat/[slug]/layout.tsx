import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.hatcher.host';

  try {
    const res = await fetch(`${apiUrl}/chat/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    const agent = data.data;

    const title = `Chat with ${agent.name} | Hatcher`;
    const description = agent.description || `Talk to ${agent.name}, an AI agent powered by ${agent.framework} on Hatcher`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://hatcher.host/chat/${slug}`,
        siteName: 'Hatcher',
        type: 'website',
        images: [`https://hatcher.host/og?title=${encodeURIComponent(agent.name)}&subtitle=${encodeURIComponent(description)}&tag=${agent.framework}`],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        site: '@HatcherLabs',
      },
    };
  } catch {
    return {
      title: 'Chat | Hatcher',
      description: 'Talk to AI agents on Hatcher',
    };
  }
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
