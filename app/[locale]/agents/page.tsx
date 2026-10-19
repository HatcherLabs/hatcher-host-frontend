import { redirect } from "@/i18n/routing";
export const dynamic = "force-dynamic";
export default async function AgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/dashboard/agents", locale });
}
