import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
export const dynamic = "force-dynamic";
export default async function AgentChatPage({ params, searchParams }: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  if (process.env.HATCHER_CHAT_ENTRY_ENABLED !== "true") notFound();
  const { id, locale } = await params;
  const { tab } = await searchParams;
  const panel = tab === "config" ? "config" : "chat";
  if (tab === "integrations" || tab === "plugins") redirect({ href: `/dashboard/agent/${encodeURIComponent(id)}?tab=${tab}`, locale });
  redirect({ href: `/?agent=${encodeURIComponent(id)}&tab=${panel}`, locale });
}
