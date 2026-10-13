import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
export const dynamic = "force-dynamic";
export default async function AgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.HATCHER_CHAT_ENTRY_ENABLED !== "true") notFound();
  const { locale } = await params;
  redirect({ href: "/?agents=1", locale });
}
