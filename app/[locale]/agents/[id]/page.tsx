import { redirect } from "@/i18n/routing";
export const dynamic = "force-dynamic";
export default async function AgentChatPage({ params, searchParams }: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id, locale } = await params;
  const { tab } = await searchParams;
  const panel = tab === "config" ? "config" : "chat";
  if (tab === "integrations" || tab === "plugins") redirect({ href: `/dashboard/agent/${encodeURIComponent(id)}?tab=${tab}`, locale });
  redirect({ href: `/dashboard/agent/${encodeURIComponent(id)}?tab=${panel}`, locale });
}
