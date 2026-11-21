import { useEffect, useState } from "react";
import { Brand } from "./site-header";
import { DebugToolsDialog } from "./debug-tools-dialog";
import {
  DEBUG_STATE_EVENT,
  readDebugSimulationState,
  resetDebugSimulation,
  type DebugSimulationState,
} from "@/lib/debug-ratelimit";
import { cn } from "@/lib/utils";

const PLAY_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

interface Props {
  statusLine?: string | null;
  className?: string;
}

export function SiteFooter({ statusLine, className }: Props) {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSim, setDebugSim] = useState<DebugSimulationState>(() => readDebugSimulationState());

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<DebugSimulationState>).detail;
      if (detail) setDebugSim(detail);
    };
    window.addEventListener(DEBUG_STATE_EVENT, onChange);
    return () => window.removeEventListener(DEBUG_STATE_EVENT, onChange);
  }, []);

  return (
    <footer className={cn("bg-background text-sm dark:bg-black", className)}>
      {statusLine && (
        <div className="bg-zinc-100 px-4 py-2.5 text-center font-mono text-xs text-zinc-600 dark:bg-[#060608] dark:text-zinc-400">
          {statusLine}
        </div>
      )}
      {debugSim.mode !== "off" && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-brand/10 px-4 py-2 text-center font-mono text-xs text-brand-ink">
          <span>
            Debug override active: API calls forced to{" "}
            {debugSim.mode === "rate_limit" ? `HTTP 429 (${debugSim.retryAfter}s)` : "Network 503"}
          </span>
          <button
            type="button"
            onClick={() => setDebugSim(resetDebugSimulation())}
            className="rounded-full bg-brand/20 px-2.5 py-0.5 text-[11px] font-medium text-brand-ink transition-colors hover:bg-brand/30"
          >
            Reset to live API
          </button>
        </div>
      )}
      <div className="mx-auto max-w-6xl border-t border-black/[0.08] px-4 py-16 sm:px-6 dark:border-white/[0.06]">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <Brand size="sm" />
            <p className="max-w-sm text-[14px] leading-6 text-zinc-600 dark:text-zinc-500">
              Run a real Minecraft server on your Android phone or tablet. Local world files,
              in-app Modrinth, KodaDash MCP, and German reverse-proxy tunnels, free forever.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={PLAY_URL}
                target="_blank"
                rel="noopener"
                className="koda-btn-pill h-8 px-3.5 text-xs whitespace-nowrap shrink-0"
              >
                Google Play
              </a>
              <a
                href="/fdroid/"
                className="koda-btn-pill h-8 px-3.5 text-xs whitespace-nowrap shrink-0"
              >
                F-Droid Repo
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-200">Product</h4>
              <ul className="space-y-2.5 text-[13.5px] text-zinc-600 dark:text-zinc-500">
                <li>
                  <a href="/dashboard" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Web Dashboard
                  </a>
                </li>
                <li>
                  <a href="/store" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Extension Store
                  </a>
                </li>
                <li>
                  <a href="/fdroid/" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    F-Droid Repository
                  </a>
                </li>
                <li>
                  <a href="/mcp" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    KodaDash MCP
                  </a>
                </li>
                <li>
                  <a
                    href="https://ko-fi.com/kodahosting"
                    target="_blank"
                    rel="noopener"
                    className="transition-colors hover:text-zinc-950 dark:hover:text-white"
                  >
                    Support on Ko-fi
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-200">Developers</h4>
              <ul className="space-y-2.5 text-[13.5px] text-zinc-600 dark:text-zinc-500">
                <li>
                  <a href="/developer" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Developer Console
                  </a>
                </li>
                <li>
                  <a href="/docs" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/libredroid-project/KodaNetwork"
                    target="_blank"
                    rel="noopener"
                    className="transition-colors hover:text-zinc-950 dark:hover:text-white"
                  >
                    GitHub Source
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions"
                    target="_blank"
                    rel="noopener"
                    className="transition-colors hover:text-zinc-950 dark:hover:text-white"
                  >
                    Extension Examples
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setDebugOpen(true)}
                    className="cursor-pointer transition-colors hover:text-zinc-950 dark:hover:text-white"
                  >
                    Debug options
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-200">Legal</h4>
              <ul className="space-y-2.5 text-[13.5px] text-zinc-600 dark:text-zinc-500">
                <li>
                  <a href="/privacy" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/tos" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/licenses" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Licenses
                  </a>
                </li>
                <li>
                  <a href="/impressum" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Impressum
                  </a>
                </li>
                <li>
                  <a href="/account-deletion" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Delete Account
                  </a>
                </li>
                <li>
                  <a href="/data-deletion" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
                    Delete Data
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Lower website notice: AI-assisted website vs human-built Android app */}
        <div className="mt-12 rounded-2xl bg-black/[0.035] px-5 py-4 text-xs leading-6 text-zinc-600 dark:bg-white/[0.03] dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-200">
            Website authorship notice:
          </span>{" "}
          Parts of this website (not the KodaHosting Android app) were generated with AI. The
          KodaHosting Android application, server runtimes, and proxy infrastructure are written by
          me, the developer.
        </div>

        <div className="mt-8 flex flex-col justify-between gap-3 border-t border-black/[0.08] pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center dark:border-white/[0.06]">
          <span>© {new Date().getFullYear()} KodaHosting · Built independently in Germany</span>
          <span>
            KodaHosting is not an official Minecraft product, is not approved by or associated with
            Mojang or Microsoft.
          </span>
        </div>
      </div>

      <DebugToolsDialog open={debugOpen} onOpenChange={setDebugOpen} />
    </footer>
  );
}
