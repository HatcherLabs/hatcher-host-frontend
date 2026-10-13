"use client";
import { useParams } from "next/navigation";
import AgentWorkspace from "@/components/agents/AgentWorkspace";
export default function AgentManagePage() {
  const { id } = useParams<{ id: string }>();
  return <AgentWorkspace key={id} id={id} />;
}
