"use client";
import { useEffect } from "react";
import ChatWorkspace from "@/components/chat/ChatWorkspace";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "@/i18n/routing";
export default function ChatPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?return=%2Fdashboard%2Fchat");
  }, [isLoading, isAuthenticated, router]);
  return !isLoading && isAuthenticated ? <ChatWorkspace /> : null;
}