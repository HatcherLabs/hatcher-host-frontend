"use client";
import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

interface Props {
  children: ReactNode;
  contentLanguage?: string;
}

/**
 * Public pages inherit the workspace navigation. Standalone/framed rendering
 * retains the public navigation when there is no workspace provider.
 */
export function MarketingShell({ children, contentLanguage }: Props) {
  const workspace = useWorkspace();
  if (workspace) return <div data-site-page lang={contentLanguage}>{children}</div>;
  return (
    <div>
      <Nav />
      <main lang={contentLanguage}>{children}</main>
      <Footer />
    </div>
  );
}
