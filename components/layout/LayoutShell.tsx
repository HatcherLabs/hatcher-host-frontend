"use client";
import { usePathname } from "next/navigation";
import { useIsFramed } from "./useIsFramed";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { isWorkspacePath } from "@/components/workspace/navigation";
export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const framed = useIsFramed();
  if (!isWorkspacePath(pathname) || framed) return <>{children}</>;
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
