import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  detail?: string;
  code?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  description,
  detail,
  code = "REQUEST FAILED",
  onRetry,
  retryLabel = "Try again",
  secondaryAction,
  compact = false,
  className,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "rounded-2xl bg-zinc-100/90 p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] sm:p-5 dark:bg-[#09090b] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          className,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/12 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
                {title}
              </p>
              {description ? (
                <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              ) : null}
              {detail ? (
                <p className="mt-2 truncate font-mono text-[11px] text-zinc-500">{detail}</p>
              ) : null}
            </div>
          </div>

          {onRetry || secondaryAction ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-4">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="koda-btn-black h-8 px-3.5 text-xs whitespace-nowrap"
                >
                  <RotateCw className="size-3.5 text-brand-ink" />
                  {retryLabel}
                </button>
              ) : null}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "resend-glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/45 to-transparent dark:via-red-400/40"
      />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="inline-flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/12 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle className="size-4" />
            </div>
            <span className="font-mono text-[11px] tracking-[0.08em] text-zinc-500 uppercase">
              {code}
            </span>
          </div>

          <h2 className="mt-4 font-display text-lg font-medium tracking-[-0.02em] text-zinc-950 sm:text-xl dark:text-white">
            {title}
          </h2>

          {description ? (
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          ) : null}

          {detail ? (
            <div className="mt-4 rounded-xl bg-black/[0.04] px-3.5 py-2.5 font-mono text-xs leading-5 text-zinc-700 dark:bg-black/70 dark:text-zinc-400">
              {detail}
            </div>
          ) : null}

          {onRetry || secondaryAction ? (
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="koda-btn-black h-9 px-4 text-xs whitespace-nowrap"
                >
                  <RotateCw className="size-3.5 text-brand-ink" />
                  {retryLabel}
                </button>
              ) : null}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
