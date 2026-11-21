import { useEffect, useState } from "react";
import { ShieldAlert, TimerReset } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The API answers HTTP 429 with retry_after. This blocks interaction until the
 * IP rate-limit cooldown finishes and cannot be dismissed early.
 */
export function OverloadDialog({
  open,
  seconds,
  nonce = 0,
  simulated = false,
  onDismiss,
}: {
  open: boolean;
  seconds: number;
  nonce?: number;
  simulated?: boolean;
  onDismiss: () => void;
}) {
  const total = Math.max(1, Math.min(seconds, 600));
  const [left, setLeft] = useState(() => total);

  useEffect(() => {
    if (!open) return;
    let remaining = Math.max(1, Math.min(seconds, 600));
    setLeft(remaining);
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        setLeft(0);
      } else {
        setLeft(remaining);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, seconds, nonce]);

  const progressPct = total > 0 ? Math.min(100, Math.max(0, ((total - left) / total) * 100)) : 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (!simulated) event.preventDefault();
          else onDismiss();
        }}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="resend-glass-panel overflow-hidden rounded-3xl border-0 p-0 text-zinc-100 shadow-[0_32px_90px_rgba(0,0,0,0.88)] sm:max-w-md"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-ink/70 to-transparent"
        />

        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand-ink">
                <ShieldAlert className="size-4" />
              </div>
              <span className="font-mono text-[11px] tracking-[0.08em] text-zinc-500 uppercase">
                HTTP 429 · IP RATE LIMIT
              </span>
            </div>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
              {simulated ? "DEBUG SIM" : "P.R.A.E.T.O.R."}
            </span>
          </div>

          <DialogTitle className="mt-5 font-display text-xl font-medium tracking-[-0.025em] text-white">
            Too many requests from this IP
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-zinc-400">
            Requests from your IP address are temporarily paused to protect the KodaHosting API and
            tunnel nodes. Access unlocks automatically once the cooldown completes.
          </DialogDescription>

          <div className="mt-6 rounded-2xl bg-black/80 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[11px] tracking-[0.06em] text-zinc-500 uppercase">
                {left > 0 ? "Cooldown remaining" : "Cooldown finished"}
              </span>
              <span className="font-mono text-3xl font-medium tracking-tight text-white tabular">
                {left > 0 ? `${left}s` : "Ready"}
              </span>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-brand-ink transition-[width] duration-700 ease-out"
                style={{ width: `${left === 0 ? 100 : progressPct}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-zinc-500">
              <span>Status: {left > 0 ? "Blocked" : "Unlocked"}</span>
              <span className="tabular">Retry-After: {total}s</span>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              disabled={left > 0}
              onClick={onDismiss}
              className="koda-btn-black h-10 w-full px-5 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              <TimerReset className="size-4 text-brand-ink" />
              {left > 0 ? `Waiting ${left}s before retry…` : "Continue to KodaHosting"}
            </button>

            {simulated && left > 0 ? (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-white/[0.12] bg-transparent text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              >
                End debug simulation early
              </button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
