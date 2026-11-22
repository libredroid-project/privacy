import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { initPageTransitions } from "@/lib/page-transition";

/**
 * Shared bootstrap for every multi-page entry point. Initializes cross-document
 * page transitions once per load and mounts the React root in StrictMode.
 */
export function mountPage(node: ReactNode): void {
  initPageTransitions();
  const container = document.getElementById("root");
  if (!container) return;
  createRoot(container).render(<StrictMode>{node}</StrictMode>);
}
