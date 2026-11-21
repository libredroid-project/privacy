import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bug,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Terminal,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedSwitch } from "@/components/animated-switch";
import { OverloadDialog } from "@/components/overload-dialog";
import { ApiError, publicApi, triggerRateLimit } from "@/lib/api";
import { API_BASE } from "@/lib/supabase";
import {
  DEBUG_OPEN_EVENT,
  DEBUG_STATE_EVENT,
  RATE_LIMIT_EVENT,
  normalizeCooldownSeconds,
  parseDebugQueryParams,
  readDebugSimulationState,
  resetDebugSimulation,
  writeDebugSimulationState,
  type ApiFaultMode,
  type DebugSimulationState,
  type RateLimitEventDetail,
} from "@/lib/debug-ratelimit";

interface ProbeResult {
  id: number;
  label: string;
  status: number | string;
  latencyMs: number;
  retryAfter?: string | null;
  detail: string;
  ok: boolean;
}

declare global {
  interface Window {
    __kodaDebug?: {
      open: () => void;
      triggerRateLimit: (seconds?: number) => void;
      setFaultMode: (mode: ApiFaultMode, retryAfter?: number) => void;
      reset: () => void;
    };
  }
}

export function DebugToolsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [sim, setSim] = useState<DebugSimulationState>(() => readDebugSimulationState());
  const [cooldown, setCooldown] = useState<string>(() => String(readDebugSimulationState().retryAfter));
  const [probing, setProbing] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [overload, setOverload] = useState<{
    open: boolean;
    seconds: number;
    simulated: boolean;
    nonce: number;
  }>({
    open: false,
    seconds: 15,
    simulated: true,
    nonce: 0,
  });

  const applySimState = useCallback((next: DebugSimulationState) => {
    const saved = writeDebugSimulationState(next);
    setSim(saved);
    setCooldown(String(saved.retryAfter));
  }, []);

  // Sync with URL query parameters (?debug=1, ?simulate_ratelimit=30, ?fault=rate_limit),
  // keyboard shortcut (Ctrl+Shift+D / Cmd+Shift+D), global events, and window.__kodaDebug.
  useEffect(() => {
    const parsed = parseDebugQueryParams(window.location.search);
    if (parsed.faultMode) {
      applySimState({
        mode: parsed.faultMode,
        retryAfter: parsed.simulateSeconds ?? readDebugSimulationState().retryAfter,
      });
    }
    if (parsed.openPanel) {
      onOpenChange(true);
    }
    if (parsed.simulateSeconds !== null) {
      setOverload((cur) => ({
        open: true,
        seconds: parsed.simulateSeconds!,
        simulated: true,
        nonce: cur.nonce + 1,
      }));
    }

    const onOpenEvent = () => onOpenChange(true);
    const onStateEvent = (event: Event) => {
      const detail = (event as CustomEvent<DebugSimulationState>).detail;
      if (detail) {
        setSim(detail);
        setCooldown(String(detail.retryAfter));
      }
    };
    const onRateLimitEvent = (event: Event) => {
      const detail = (event as CustomEvent<RateLimitEventDetail>).detail;
      if (!detail) return;
      setOverload((cur) => ({
        open: true,
        seconds: detail.seconds,
        simulated: detail.simulated,
        nonce: cur.nonce + 1,
      }));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener(DEBUG_OPEN_EVENT, onOpenEvent);
    window.addEventListener(DEBUG_STATE_EVENT, onStateEvent);
    window.addEventListener(RATE_LIMIT_EVENT, onRateLimitEvent);
    window.addEventListener("keydown", onKeyDown);

    window.__kodaDebug = {
      open: () => onOpenChange(true),
      triggerRateLimit: (seconds = 15) => {
        triggerRateLimit(normalizeCooldownSeconds(seconds, 15), true);
      },
      setFaultMode: (mode: ApiFaultMode, retryAfter = 30) => {
        applySimState({ mode, retryAfter });
      },
      reset: () => {
        const clean = resetDebugSimulation();
        setSim(clean);
        setCooldown(String(clean.retryAfter));
      },
    };

    return () => {
      window.removeEventListener(DEBUG_OPEN_EVENT, onOpenEvent);
      window.removeEventListener(DEBUG_STATE_EVENT, onStateEvent);
      window.removeEventListener(RATE_LIMIT_EVENT, onRateLimitEvent);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [applySimState, onOpenChange, open]);

  async function runProbe(count: number) {
    setProbing(true);
    const nextBatch: ProbeResult[] = [];
    for (let i = 0; i < count; i++) {
      const started = performance.now();
      const label = count > 1 ? `Burst ${i + 1}/${count}` : "Single probe";
      try {
        if (sim.mode !== "off") {
          await publicApi("/v1/extensions?limit=1");
        } else {
          const res = await fetch(`${API_BASE}/v1/extensions?limit=1`);
          const latencyMs = Math.round(performance.now() - started);
          const retryAfter = res.headers.get("retry-after");
          if (res.status === 429) {
            triggerRateLimit(normalizeCooldownSeconds(retryAfter, 30), false);
          }
          nextBatch.push({
            id: Date.now() + i,
            label,
            status: res.status,
            latencyMs,
            retryAfter,
            detail: res.ok
              ? "Live API responded normally"
              : res.status === 429
                ? "Real server HTTP 429 rate limit triggered"
                : `API returned HTTP ${res.status}`,
            ok: res.ok,
          });
          continue;
        }
      } catch (err) {
        const latencyMs = Math.round(performance.now() - started);
        const status = err instanceof ApiError ? err.status : "ERR";
        nextBatch.push({
          id: Date.now() + i,
          label,
          status,
          latencyMs,
          detail: err instanceof Error ? err.message : "Request failed",
          ok: false,
        });
      }
    }
    setResults((prev) => [...nextBatch.reverse(), ...prev].slice(0, 8));
    setProbing(false);
  }

  function handleTriggerOverload() {
    const secs = normalizeCooldownSeconds(cooldown, 15);
    onOpenChange(false);
    triggerRateLimit(secs, true);
  }

  function handleReset() {
    const clean = resetDebugSimulation();
    setSim(clean);
    setCooldown(String(clean.retryAfter));
    setResults([]);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-lg rounded-3xl border border-black/[0.08] bg-white p-0 text-zinc-900 shadow-[0_32px_90px_rgba(0,0,0,0.45)] dark:border-white/[0.1] dark:bg-[#08080b] dark:text-zinc-100"
        >
          <div className="p-6 sm:p-7">
            <DialogHeader className="text-left">
              <div className="flex items-center justify-between gap-3 pr-9">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-zinc-500 uppercase">
                  <Bug className="size-3.5 text-brand-ink" />
                  Debug &amp; Rate-Limit Diagnostics
                </span>
                <span className="shrink-0 rounded-full bg-black/[0.06] px-2.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400">
                  Ctrl+Shift+D
                </span>
              </div>
              <DialogTitle className="mt-2 font-display text-xl font-medium tracking-[-0.02em]">
                Test IP rate limiting &amp; error states
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Simulate HTTP 429 IP cooldowns, intercept outgoing API calls across pages, or send
                real probe requests to verify live rate-limit headers.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-5">
              {/* 1. Instant OverloadDialog Trigger */}
              <div className="rounded-2xl bg-black/[0.035] p-4 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
                    1. Simulate HTTP 429 IP block screen
                  </span>
                  <AnimatedSwitch<string>
                    ariaLabel="Simulated rate limit cooldown duration"
                    size="sm"
                    value={cooldown}
                    onChange={(val) => {
                      setCooldown(val);
                      applySimState({ mode: sim.mode, retryAfter: Number(val) });
                    }}
                    options={[
                      { id: "5", label: "5s" },
                      { id: "15", label: "15s" },
                      { id: "30", label: "30s" },
                      { id: "60", label: "60s" },
                    ]}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  Opens the real IP rate-limit cooldown modal immediately with a live countdown bar
                  and early-exit option.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerOverload}
                  className="koda-btn-black mt-3.5 h-10 w-full px-4 text-xs"
                >
                  <ShieldAlert className="size-3.5 text-brand-ink" />
                  Trigger HTTP 429 Overload Screen ({cooldown}s)
                </button>
              </div>

              {/* 2. Persistent API Interceptor */}
              <div className="rounded-2xl bg-black/[0.035] p-4 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
                    2. Session API fault interceptor
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {sim.mode === "off" ? "Live" : sim.mode}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  Persists in sessionStorage across /store, /dashboard, /developer, and /mcp so you
                  can verify real error screens on page load.
                </p>
                <div className="mt-3">
                  <AnimatedSwitch<ApiFaultMode>
                    ariaLabel="API fault simulation mode"
                    size="sm"
                    value={sim.mode}
                    onChange={(mode) =>
                      applySimState({ mode, retryAfter: normalizeCooldownSeconds(cooldown, 30) })
                    }
                    options={[
                      { id: "off", label: "Live API" },
                      { id: "rate_limit", label: "Force 429" },
                      { id: "network_error", label: "Force 503" },
                    ]}
                  />
                </div>
              </div>

              {/* 3. Live API Rate-Limit Probe */}
              <div className="rounded-2xl bg-black/[0.035] p-4 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-200">
                    <Activity className="size-3.5 text-brand-ink" />
                    3. Probe API rate-limit response
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">GET /v1/extensions</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={probing}
                    onClick={() => void runProbe(1)}
                    className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-50"
                  >
                    {probing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Terminal className="size-3.5" />
                    )}
                    Single probe
                  </button>
                  <button
                    type="button"
                    disabled={probing}
                    onClick={() => void runProbe(5)}
                    className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-50"
                  >
                    <Zap className="size-3.5 text-brand-ink" />
                    Burst test (5x)
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-500 transition-colors hover:bg-black/[0.05] hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </button>
                </div>

                {results.length > 0 ? (
                  <div className="mt-3 max-h-36 space-y-1.5 overflow-y-auto rounded-xl bg-black/90 p-3 font-mono text-[11px] text-zinc-300">
                    {results.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          <span className={r.ok ? "text-emerald-400" : "text-brand-ink"}>
                            [{r.status}]
                          </span>{" "}
                          {r.label}: {r.detail}
                          {r.retryAfter ? ` (Retry-After: ${r.retryAfter}s)` : ""}
                        </span>
                        <span className="shrink-0 text-zinc-500 tabular">{r.latencyMs}ms</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OverloadDialog
        open={overload.open}
        seconds={overload.seconds}
        nonce={overload.nonce}
        simulated={overload.simulated}
        onDismiss={() => setOverload((cur) => ({ ...cur, open: false }))}
      />
    </>
  );
}
