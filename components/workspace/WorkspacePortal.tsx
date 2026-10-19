"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useWorkspace } from "./WorkspaceContext";

/** Keep the page's state and context while moving its controls into the shell. */
export function WorkspacePortal({ children, region = "navigation" }: {
  children: ReactNode;
  region?: "navigation" | "actions" | "tools" | "header" | "settings";
}) {
  const workspace = useWorkspace();
  if (!workspace) return <>{children}</>;
  const target = workspace[`${region}Target`];
  return target ? createPortal(children, target) : null;
}
