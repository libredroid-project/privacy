import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CheckLevel, PreflightReport } from "@/developer/preflight";
import { cn } from "@/lib/utils";

const ICON: Record<CheckLevel, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const ICON_CLASS: Record<CheckLevel, string> = {
  pass: "text-success",
  warn: "text-warning",
  fail: "text-destructive",
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
    <Card className={cn("gap-0 overflow-hidden shadow-none", compact ? "p-0" : "p-0")}>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Pre-publish checks</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-normal tone-online">
            {report.passes} passed
          </Badge>
          {report.warns > 0 ? (
            <Badge variant="outline" className="font-normal tone-pending">
              {report.warns} warnings
            </Badge>
          ) : null}
          {report.fails > 0 ? (
            <Badge variant="outline" className="font-normal tone-danger">
              {report.fails} blocking
            </Badge>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "divide-y overflow-y-auto",
          compact ? "max-h-64" : "max-h-96",
        )}
      >
        {groups.map((group) => (
          <div key={group}>
            <p className="bg-muted/30 px-4 py-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {group}
            </p>
            <ul className="divide-y">
              {report.checks
                .filter((check) => check.group === group)
                .map((check) => {
                  const Icon = ICON[check.level];
                  return (
                    <li key={check.id} className="flex items-start gap-2.5 px-4 py-2">
                      <Icon className={cn("mt-0.5 size-3.5 shrink-0", ICON_CLASS[check.level])} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{check.title}</p>
                        <p
                          className={cn(
                            "mt-0.5 text-[11px] leading-4",
                            check.level === "fail"
                              ? "text-destructive"
                              : check.level === "warn"
                                ? "text-warning"
                                : "text-muted-foreground",
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
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Ready to publish. Warnings are recommendations, not blockers.
        </p>
      ) : null}
    </Card>
  );
}
