import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  MessageSquareWarning,
  Plus,
  Puzzle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DevExtension, DeveloperMe } from "@/developer/types";
import { formatDate, formatDateTime, latestVersion, pendingVersion, displayStatus, displayStatusTone } from "@/developer/types";
import { VerifyEmail } from "@/developer/verify-email";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Puzzle;
}) {
  return (
    <Card className="gap-0 p-5 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

export function DeveloperOverview({
  me,
  extensions,
  onOpenExtension,
  onNew,
  onVerified,
  onShowAccount,
}: {
  me: DeveloperMe | null;
  extensions: DevExtension[];
  onOpenExtension: (extId: string) => void;
  onNew: () => void;
  onVerified: () => void;
  onShowAccount: () => void;
}) {
  const live = extensions.filter((ext) => ext.status === "APPROVED");
  const inReview = extensions.filter((ext) => ext.status === "PENDING");
  const downloads = extensions.reduce((sum, ext) => sum + (ext.downloads || 0), 0);
  const pending = extensions
    .map((ext) => ({ ext, version: pendingVersion(ext) }))
    .filter((entry) => entry.version);
  const reviewIds = new Set([
    ...inReview.map((ext) => ext.ext_id),
    ...pending.map((entry) => entry.ext.ext_id),
  ]);

  const attention = [
    ...extensions
      .filter((ext) => (ext.status === "REJECTED" || ext.status === "DELISTED") && ext.review_note)
      .map((ext) => ({
        ext,
        label: ext.status === "DELISTED" ? "Delisted" : "Rejected",
        note: ext.review_note || "",
        tone: "danger" as const,
      })),
    ...extensions
      .filter((ext) => ext.status === "APPROVED" && ext.versions.some((version) => version.status === "REJECTED" && version.review_note))
      .map((ext) => {
        const rejected = ext.versions.find((version) => version.status === "REJECTED" && version.review_note);
        return {
          ext,
          label: `v${rejected?.version} rejected`,
          note: rejected?.review_note || "",
          tone: "danger" as const,
        };
      }),
  ].slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Developer console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {me?.email ? `${me.email} · ` : ""}
            extensions for the KodaHosting app
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus className="size-4" /> New extension
        </Button>
      </div>

      {me && !me.email_verified ? <VerifyEmail me={me} onVerified={onVerified} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Extensions" value={extensions.length} icon={Puzzle} />
        <Stat label="Live" value={live.length} hint="visible in the store" icon={CheckCircle2} />
        <Stat
          label="In review"
          value={reviewIds.size}
          hint="versions waiting for a decision"
          icon={Clock3}
        />
        <Stat label="Downloads" value={downloads.toLocaleString()} icon={Download} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="gap-0 p-5 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Your extensions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Open one to edit the listing or the code.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onNew}>
              <Plus className="size-4" /> New
            </Button>
          </div>

          {extensions.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No extensions yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Submit a .kodaext package. After the review it appears in the store and can be updated
                from here.
              </p>
              <Button size="sm" className="mt-4" onClick={onNew}>
                <Plus className="size-4" /> Submit the first one
              </Button>
            </div>
          ) : (
            <ul className="mt-4 divide-y">
              {extensions.slice(0, 6).map((ext) => {
                const latest = latestVersion(ext);
                return (
                  <li key={ext.ext_id}>
                    <button
                      type="button"
                      onClick={() => onOpenExtension(ext.ext_id)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/30"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-sm font-medium">
                        {ext.icon_url ? (
                          <img src={ext.icon_url} alt="" className="size-full object-cover" />
                        ) : (
                          ext.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{ext.name}</p>
                          <Badge variant="outline" className={`font-normal ${displayStatusTone(ext)}`}>
                            {displayStatus(ext)}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {latest ? `v${latest.version} · ` : ""}
                          {ext.downloads.toLocaleString()} downloads
                          {ext.updated_at ? ` · updated ${formatDate(ext.updated_at)}` : ""}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="gap-0 p-5 shadow-none">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Needs attention</h2>
            </div>
            {attention.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing rejected and nothing waiting for your fix.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {attention.map((entry) => (
                  <li key={`${entry.ext.ext_id}-${entry.label}`}>
                    <button
                      type="button"
                      onClick={() => onOpenExtension(entry.ext.ext_id)}
                      className="w-full rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-left transition-colors hover:bg-destructive/10"
                    >
                      <p className="text-xs font-medium text-destructive">
                        {entry.ext.name} · {entry.label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.note}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="gap-0 p-5 shadow-none">
            <h2 className="text-sm font-semibold">Waiting for review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pending.length === 0
                ? "No version is in the queue."
                : `${pending.length} ${pending.length === 1 ? "version is" : "versions are"} in the queue.`}
            </p>
            {pending.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {pending.slice(0, 4).map((entry) => (
                  <li key={entry.ext.ext_id}>
                    <button
                      type="button"
                      onClick={() => onOpenExtension(entry.ext.ext_id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-left text-xs transition-colors hover:bg-accent/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{entry.ext.name}</span>
                        <span className="block text-muted-foreground">
                          v{entry.version?.version} ({entry.version?.version_code}) ·{" "}
                          {formatDateTime(entry.version?.created_at)}
                        </span>
                      </span>
                      <Badge variant="outline" className="shrink-0 font-normal tone-pending">
                        PENDING
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button variant="ghost" size="sm" className="mt-3 px-0 text-muted-foreground" onClick={onShowAccount}>
              Publisher account
              <ArrowRight className="size-3.5" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
