import { useState } from "react";
import { AlertCircle, Check, Copy, Loader2, Plus, ShieldAlert, Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import type { DevExtension, DevVersion } from "@/developer/types";
import { formatBytes, formatDateTime, latestVersion, pendingVersion, statusDotClasses } from "@/developer/types";
import { cn } from "@/lib/utils";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-white"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function VersionRow({ version }: { version: DevVersion }) {
  const [open, setOpen] = useState(false);
  const tone = statusDotClasses(version.status);
  return (
    <>
      <tr
        className="cursor-pointer border-t border-zinc-200/70 transition-colors hover:bg-black/[0.025] dark:border-white/[0.06] dark:hover:bg-white/[0.03]"
        onClick={() => setOpen((value) => !value)}
      >
        <td className="py-3.5 pr-4 font-mono text-xs text-zinc-900 tabular dark:text-zinc-100">
          {version.version}
          <span className="ml-2 text-zinc-500">({version.version_code})</span>
        </td>
        <td className="py-3.5 pr-4">
          <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-medium", tone.text)}>
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {version.status}
          </span>
        </td>
        <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-zinc-500">
          {formatBytes(version.file_size)}
        </td>
        <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-zinc-500">
          {formatDateTime(version.created_at)}
        </td>
        <td className="max-w-[280px] py-3.5 pr-4">
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{version.changelog || "-"}</p>
        </td>
        <td className="py-3.5 text-right font-mono text-[11px] text-zinc-500">
          {open ? "Hide" : "Details"}
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-zinc-200/70 bg-zinc-50/70 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <td colSpan={6} className="px-3 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                  Changelog
                </p>
                <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                  {version.changelog || "No changelog."}
                </p>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <p>
                  <span className="text-zinc-500">Permissions:</span>{" "}
                  <span className="font-mono">
                    {version.permissions?.length ? version.permissions.join(", ") : "none"}
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500">Min app version:</span>{" "}
                  <span className="font-mono">{version.min_app_version || 0}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-zinc-500">SHA-256:</span>
                  <span className="truncate font-mono">{version.sha256 || "-"}</span>
                  {version.sha256 ? <CopyButton value={version.sha256} /> : null}
                </p>
                <p>
                  <span className="text-zinc-500">Uploaded:</span>{" "}
                  <span className="font-mono">{formatDateTime(version.created_at)}</span>
                </p>
                {version.verified_at ? (
                  <p>
                    <span className="text-zinc-500">Package verified:</span>{" "}
                    <span className="font-mono">{formatDateTime(version.verified_at)}</span>
                  </p>
                ) : null}
                {version.reviewed_at ? (
                  <p>
                    <span className="text-zinc-500">Reviewed:</span>{" "}
                    <span className="font-mono">{formatDateTime(version.reviewed_at)}</span>
                  </p>
                ) : null}
              </div>
            </div>
            {version.review_note ? (
              <p
                className={cn(
                  "mt-3 rounded-xl border p-3 text-sm",
                  version.status === "REJECTED"
                    ? "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-400"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300",
                )}
              >
                <span className="font-medium">Review note: </span>
                {version.review_note}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function VersionsPanel({
  ext,
  onChanged,
  onEditCode,
  onNewRelease,
}: {
  ext: DevExtension;
  onChanged: () => void;
  onEditCode: () => void;
  onNewRelease: () => void;
}) {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const latest = latestVersion(ext);
  const pending = pendingVersion(ext);

  async function withdraw() {
    setBusy(true);
    setError("");
    try {
      await api(`/v1/extensions/${encodeURIComponent(ext.ext_id)}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      setWithdrawOpen(false);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {ext.review_note ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4",
            ext.status === "REJECTED" || ext.status === "DELISTED"
              ? "border-red-500/25 bg-red-500/5 dark:bg-red-500/10"
              : "resend-glass-panel border-transparent",
          )}
        >
          {ext.status === "REJECTED" || ext.status === "DELISTED" ? (
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-zinc-500" />
          )}
          <div>
            <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              {ext.status === "REJECTED" || ext.status === "DELISTED"
                ? "The review rejected this extension"
                : "Review note"}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{ext.review_note}</p>
          </div>
        </div>
      ) : null}

      <div className="resend-glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">Releases</h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Every version of {ext.name}. Each new release goes through review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEditCode}
              disabled={!latest}
              className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-45"
            >
              Edit package
            </button>
            <button
              type="button"
              onClick={onNewRelease}
              disabled={Boolean(pending)}
              title={pending ? "A version is already in review" : undefined}
              className="koda-btn-black h-8 px-3.5 text-xs disabled:opacity-45"
            >
              <Plus className="size-3.5" />
              New release
            </button>
          </div>
        </div>

        {pending ? (
          <p className="mt-4 rounded-xl border border-dashed border-amber-500/35 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
            v{pending.version} ({pending.version_code}) is in review. Only one version per extension can wait for a decision at a time.
          </p>
        ) : null}

        {ext.versions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-white/[0.1] dark:text-zinc-400">
            No release yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                  <th className="pb-2.5 pr-4 font-medium">Version</th>
                  <th className="pb-2.5 pr-4 font-medium">Status</th>
                  <th className="pb-2.5 pr-4 font-medium">Size</th>
                  <th className="pb-2.5 pr-4 font-medium">Uploaded</th>
                  <th className="pb-2.5 pr-4 font-medium">Changelog</th>
                  <th className="pb-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {ext.versions.map((version) => (
                  <VersionRow key={version.version_code} version={version} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 pt-4 dark:border-white/[0.06]">
          <p className="max-w-lg text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Withdrawing removes the extension from the store immediately. Your releases and packages stay here, and your next release puts it back into review.
          </p>
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            disabled={ext.status === "WITHDRAWN"}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-45 dark:text-zinc-400 dark:hover:text-red-400"
          >
            <Undo2 className="size-3.5" />
            {ext.status === "WITHDRAWN" ? "Withdrawn" : "Withdraw extension"}
          </button>
        </div>
      </div>

      <AlertDialog open={withdrawOpen} onOpenChange={(open) => (busy ? null : setWithdrawOpen(open))}>
        <AlertDialogContent className="rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Withdraw "{ext.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The listing disappears from the store immediately. The next release brings it back into review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="rounded-full">
              Keep it listed
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-500"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void withdraw();
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
