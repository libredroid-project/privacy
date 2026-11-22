import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import type { CheckLevel, PreflightReport } from "@/developer/preflight";
import { cn } from "@/lib/utils";

const ICON: Record<CheckLevel, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const ICON_CLASS: Record<CheckLevel, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

export function PreflightPanel({
  report,
  compact,
}: {
  report: PreflightReport;
  compact?: boolean;
}) {
  const groups = [...new Set(report.checks.map((check) => check.group))];

  return (
    <div className="resend-glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 px-4 py-3 dark:border-white/[0.06]">
        <ShieldCheck className="size-4 text-zinc-500" />
        <span className="font-display text-sm font-medium text-zinc-950 dark:text-white">
          Pre-publish checks
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[11px] tabular-nums">
          <span className="text-emerald-700 dark:text-emerald-400">{report.passes} passed</span>
          {report.warns > 0 ? (
            <span className="text-amber-700 dark:text-amber-300">{report.warns} warnings</span>
          ) : null}
          {report.fails > 0 ? (
            <span className="text-red-700 dark:text-red-400">{report.fails} blocking</span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "divide-y divide-zinc-200/70 overflow-y-auto dark:divide-white/[0.06]",
          compact ? "max-h-64" : "max-h-96",
        )}
      >
        {groups.map((group) => (
          <div key={group}>
            <p className="bg-zinc-50/90 px-4 py-1.5 font-mono text-[10px] font-medium tracking-[0.08em] text-zinc-500 uppercase dark:bg-white/[0.025]">
              {group}
            </p>
            <ul className="divide-y divide-zinc-200/60 dark:divide-white/[0.05]">
              {report.checks
                .filter((check) => check.group === group)
                .map((check) => {
                  const Icon = ICON[check.level];
                  return (
                    <li key={check.id} className="flex items-start gap-2.5 px-4 py-2.5">
                      <Icon className={cn("mt-0.5 size-3.5 shrink-0", ICON_CLASS[check.level])} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {check.title}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-[11px] leading-4",
                            check.level === "fail"
                              ? "text-red-600 dark:text-red-400"
                              : check.level === "warn"
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {check.detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      {report.ok ? (
        <p className="border-t border-zinc-200/80 px-4 py-2.5 text-xs text-zinc-500 dark:border-white/[0.06] dark:text-zinc-400">
          Ready to publish. Warnings are recommendations, not blockers.
        </p>
      ) : null}
    </div>
  );
}
