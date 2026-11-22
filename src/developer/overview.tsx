import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  MessageSquareWarning,
  Plus,
  Puzzle,
} from "lucide-react";
import type { DevExtension, DeveloperMe } from "@/developer/types";
import {
  displayStatus,
  displayStatusDotClasses,
  formatDate,
  formatDateTime,
  latestVersion,
  pendingVersion,
} from "@/developer/types";
import { VerifyEmail } from "@/developer/verify-email";
import { safeImageUrl } from "@/lib/security";
import { cn } from "@/lib/utils";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "text-zinc-500 dark:text-zinc-400",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Puzzle;
  tone?: string;
}) {
  return (
    <div className="resend-glass-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
            {label}
          </p>
          <p className="mt-2.5 font-display text-2xl font-medium tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-white">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
        </div>
        <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.05]">
          <Icon className={cn("size-4", tone)} />
        </div>
      </div>
    </div>
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
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
            Developer console
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {me?.email ? `${me.email} · ` : ""}
            Extensions for the KodaHosting app
          </p>
        </div>
        <button type="button" onClick={onNew} className="koda-btn-black h-9 px-4 text-xs">
          <Plus className="size-3.5" /> New extension
        </button>
      </div>

      {me && !me.email_verified ? <VerifyEmail me={me} onVerified={onVerified} /> : null}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Extensions" value={extensions.length} icon={Puzzle} tone="text-brand-ink" />
        <Stat
          label="Live"
          value={live.length}
          hint="Visible in the store"
          icon={CheckCircle2}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <Stat
          label="In review"
          value={reviewIds.size}
          hint="Waiting for a decision"
          icon={Clock3}
          tone="text-amber-600 dark:text-amber-400"
        />
        <Stat
          label="Downloads"
          value={downloads.toLocaleString()}
          icon={Download}
          tone="text-sky-600 dark:text-sky-400"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="resend-glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
                Your extensions
              </h2>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                Open an extension to edit its store listing, releases, or source code.
              </p>
            </div>
            <button type="button" onClick={onNew} className="koda-btn-pill h-8 px-3 text-xs">
              <Plus className="size-3.5" /> New
            </button>
          </div>

          {extensions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-white/[0.1]">
              <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
                No extensions yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                Submit a .kodaext package. Once reviewed, it appears in the store and can be updated from here.
              </p>
              <button type="button" onClick={onNew} className="koda-btn-black mt-4 h-8 px-4 text-xs">
                <Plus className="size-3.5" /> Submit your first one
              </button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
              {extensions.slice(0, 6).map((ext) => {
                const latest = latestVersion(ext);
                const iconSrc = safeImageUrl(ext.icon_url);
                const tone = displayStatusDotClasses(ext);
                return (
                  <li key={ext.ext_id}>
                    <button
                      type="button"
                      onClick={() => onOpenExtension(ext.ext_id)}
                      className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 font-display text-sm font-medium text-zinc-800 ring-1 ring-black/[0.06] dark:bg-white/[0.06] dark:text-white dark:ring-white/[0.08]">
                        {iconSrc ? (
                          <img src={iconSrc} alt="" className="size-full object-cover" />
                        ) : (
                          ext.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          <p className="truncate font-display text-sm font-medium text-zinc-950 dark:text-white">
                            {ext.name}
                          </p>
                          <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px]", tone.text)}>
                            <span className={cn("size-1.5 rounded-full", tone.dot)} />
                            {displayStatus(ext)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                          {latest ? `v${latest.version} · ` : ""}
                          {ext.downloads.toLocaleString()} downloads
                          {ext.updated_at ? ` · updated ${formatDate(ext.updated_at)}` : ""}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-zinc-200" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="resend-glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="size-4 text-zinc-500" />
              <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
                Needs attention
              </h2>
            </div>
            {attention.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Nothing rejected and nothing waiting for a fix.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {attention.map((entry) => (
                  <li key={`${entry.ext.ext_id}-${entry.label}`}>
                    <button
                      type="button"
                      onClick={() => onOpenExtension(entry.ext.ext_id)}
                      className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left transition-colors hover:bg-red-500/10"
                    >
                      <p className="font-mono text-xs font-medium text-red-700 dark:text-red-400">
                        {entry.ext.name} · {entry.label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {entry.note}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="resend-glass-panel rounded-2xl p-5">
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Waiting for review
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {pending.length === 0
                ? "No version is currently in the queue."
                : `${pending.length} ${pending.length === 1 ? "version is" : "versions are"} in the queue.`}
            </p>
            {pending.length > 0 ? (
              <ul className="mt-3 divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                {pending.slice(0, 4).map((entry) => (
                  <li key={entry.ext.ext_id}>
                    <button
                      type="button"
                      onClick={() => onOpenExtension(entry.ext.ext_id)}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left text-xs transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display font-medium text-zinc-950 dark:text-white">
                          {entry.ext.name}
                        </span>
                        <span className="block font-mono text-[11px] text-zinc-500">
                          v{entry.version?.version} ({entry.version?.version_code}) ·{" "}
                          {formatDateTime(entry.version?.created_at)}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                        <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                        PENDING
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={onShowAccount}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Publisher account
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
