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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { DevExtension, DevVersion } from "@/developer/types";
import { formatBytes, formatDateTime, latestVersion, pendingVersion, statusTone } from "@/developer/types";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function VersionRow({ version }: { version: DevVersion }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-t transition-colors hover:bg-accent/30"
        onClick={() => setOpen((value) => !value)}
      >
        <td className="py-3 pr-4 font-mono text-xs">
          {version.version}
          <span className="ml-2 text-muted-foreground">({version.version_code})</span>
        </td>
        <td className="py-3 pr-4">
          <Badge variant="outline" className={`font-normal ${statusTone(version.status)}`}>
            {version.status}
          </Badge>
        </td>
        <td className="py-3 pr-4 text-xs text-muted-foreground">{formatBytes(version.file_size)}</td>
        <td className="py-3 pr-4 text-xs text-muted-foreground">{formatDateTime(version.created_at)}</td>
        <td className="max-w-[280px] py-3 pr-4">
          <p className="truncate text-xs text-muted-foreground">{version.changelog || "-"}</p>
        </td>
        <td className="py-3 text-right text-xs text-muted-foreground">{open ? "Hide" : "Details"}</td>
      </tr>
      {open ? (
        <tr className="border-t bg-muted/20">
          <td colSpan={6} className="px-1 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Changelog
                </p>
                <p className="whitespace-pre-wrap text-sm">{version.changelog || "No changelog."}</p>
              </div>
              <div className="space-y-2 text-xs">
                <p>
                  <span className="text-muted-foreground">Permissions:</span>{" "}
                  <span className="font-mono">
                    {version.permissions?.length ? version.permissions.join(", ") : "none"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Min app version:</span>{" "}
                  {version.min_app_version || 0}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">SHA-256:</span>
                  <span className="truncate font-mono">{version.sha256 || "-"}</span>
                  {version.sha256 ? <CopyButton value={version.sha256} /> : null}
                </p>
                <p>
                  <span className="text-muted-foreground">Uploaded:</span> {formatDateTime(version.created_at)}
                </p>
                {version.verified_at ? (
                  <p>
                    <span className="text-muted-foreground">Package verified:</span>{" "}
                    {formatDateTime(version.verified_at)}
                  </p>
                ) : null}
                {version.reviewed_at ? (
                  <p>
                    <span className="text-muted-foreground">Reviewed:</span>{" "}
                    {formatDateTime(version.reviewed_at)}
                  </p>
                ) : null}
              </div>
            </div>
            {version.review_note ? (
              <p
                className={`mt-3 rounded-md border p-3 text-sm ${
                  version.status === "REJECTED"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "text-muted-foreground"
                }`}
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
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            ext.status === "REJECTED" || ext.status === "DELISTED"
              ? "border-destructive/30 bg-destructive/5"
              : "border-border/70 bg-card"
          }`}
        >
          {ext.status === "REJECTED" || ext.status === "DELISTED" ? (
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          ) : (
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {ext.status === "REJECTED" || ext.status === "DELISTED"
                ? "The review rejected this extension"
                : "Review note"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{ext.review_note}</p>
          </div>
        </div>
      ) : null}

      <Card className="gap-0 p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Releases</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every version of {ext.name}. A new release re-enters the review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEditCode} disabled={!latest}>
              Edit package
            </Button>
            <Button
              size="sm"
              onClick={onNewRelease}
              disabled={Boolean(pending)}
              title={pending ? "A version is already in review" : undefined}
            >
              <Plus className="size-4" />
              New release
            </Button>
          </div>
        </div>

        {pending ? (
          <p className="mt-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            v{pending.version} ({pending.version_code}) is in review. One version per extension can
            wait for a decision.
          </p>
        ) : null}

        {ext.versions.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No release yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="pb-2 pr-4 font-medium">Version</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Size</th>
                  <th className="pb-2 pr-4 font-medium">Uploaded</th>
                  <th className="pb-2 pr-4 font-medium">Changelog</th>
                  <th className="pb-2 text-right font-medium" />
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

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-lg text-xs text-muted-foreground">
            Withdrawing removes the extension from the store. The releases and the package stay in
            the console, and the next release puts it back into review.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
            disabled={ext.status === "WITHDRAWN"}
          >
            <Undo2 className="size-4" />
            {ext.status === "WITHDRAWN" ? "Withdrawn" : "Withdraw extension"}
          </Button>
        </div>
      </Card>

      <AlertDialog open={withdrawOpen} onOpenChange={(open) => (busy ? null : setWithdrawOpen(open))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw “{ext.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The listing disappears from the store immediately. The next release brings it back
              into review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it listed</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
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
