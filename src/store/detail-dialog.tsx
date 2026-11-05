import { useEffect, useState } from "react";
import { Download, ExternalLink, FileCode2, Globe, Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKb, relativeDate } from "@/lib/format";
import { publicApi } from "@/lib/api";
import { API_BASE } from "@/lib/supabase";
import type { ExtensionDetail } from "@/store/types";

function Icon({ url, name, size = "size-14" }: { url?: string; name: string; size?: string }) {
  if (url) {
    return <img src={url} alt="" className={`${size} shrink-0 rounded-lg border object-cover`} />;
  }
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-lg border bg-muted text-lg font-medium`}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function DetailDialog({
  extId,
  onClose,
}: {
  extId: string | null;
  onClose: () => void;
}) {
  const [ext, setExt] = useState<ExtensionDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!extId) return;
    let cancelled = false;
    setLoading(true);
    setExt(null);
    setError("");
    publicApi<{ extension: ExtensionDetail }>(`/v1/extensions/${encodeURIComponent(extId)}`)
      .then((data) => {
        if (!cancelled) setExt(data.extension);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [extId]);

  const latest = ext?.versions?.[0];

  return (
    <Dialog open={Boolean(extId)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {loading ? (
          <>
            <DialogTitle className="sr-only">Extension</DialogTitle>
            <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading the extension…
            </div>
          </>
        ) : error ? (
          <div className="p-6">
            <DialogTitle className="sr-only">Extension</DialogTitle>
            <Alert variant="destructive">
              <AlertDescription>Could not load this extension: {error}</AlertDescription>
            </Alert>
          </div>
        ) : ext ? (
          <>
            <DialogHeader className="gap-3 border-b p-6 pr-14">
              <div className="flex items-start gap-4">
                <Icon url={ext.icon_url} name={ext.name} />
                <div className="min-w-0">
                  <DialogTitle className="text-xl">{ext.name}</DialogTitle>
                  <DialogDescription className="mt-1">
                    <span className="font-mono text-xs">{ext.ext_id}</span>
                    {ext.author ? (
                      <>
                        {" · by "}
                        <a
                          href={`/store?author=${encodeURIComponent(ext.author)}`}
                          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-brand"
                        >
                          {ext.author}
                        </a>
                      </>
                    ) : null}
                  </DialogDescription>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {latest ? <Badge variant="secondary">v{latest.version}</Badge> : null}
                    <Badge variant="outline" className="font-normal">
                      {ext.downloads || 0} downloads
                    </Badge>
                    {ext.license ? (
                      <Badge variant="outline" className="font-normal">
                        {ext.license}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
                {[
                  ["Version", latest?.version ? `v${latest.version}` : "—"],
                  ["Size", formatKb(latest?.file_size)],
                  ["License", ext.license || "—"],
                  ["SHA-256", latest?.sha256 ? `${latest.sha256.slice(0, 16)}…` : "—"],
                  ["Needs app", latest?.min_app_version ? `v${latest.min_app_version}` : "—"],
                  ["Downloads", String(ext.downloads || 0)],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="font-medium break-all">{value}</span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Every version is checked by hand before publishing.
                </div>
              </div>

              <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                {ext.description || ext.summary || "No description provided."}
              </p>

              {ext.screenshots?.length ? (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {ext.screenshots.map((shot) => (
                    <img
                      key={shot}
                      src={shot}
                      alt=""
                      loading="lazy"
                      className="h-40 w-auto shrink-0 rounded-lg border object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {ext.source_url || ext.homepage_url ? (
                <div className="flex flex-wrap gap-4 text-sm">
                  {ext.source_url ? (
                    <a
                      href={ext.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium underline decoration-border underline-offset-4 hover:decoration-brand"
                    >
                      <FileCode2 className="size-4" /> Source code
                    </a>
                  ) : null}
                  {ext.homepage_url ? (
                    <a
                      href={ext.homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium underline decoration-border underline-offset-4 hover:decoration-brand"
                    >
                      <Globe className="size-4" /> Homepage
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div>
                <h3 className="mb-3 text-sm font-semibold">Versions</h3>
                <div className="space-y-3">
                  {(ext.versions || []).map((version, index) => (
                    <div key={`${version.version}-${version.version_code}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold">v{version.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {relativeDate(version.released_at)}
                        </span>
                        {index === 0 ? (
                          <Badge className="tone-online ml-auto" variant="outline">
                            latest
                          </Badge>
                        ) : null}
                      </div>
                      {version.permissions?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {version.permissions.map((permission) => (
                            <Badge key={permission} variant="secondary" className="font-mono text-[10px] font-normal">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {version.changelog ? (
                        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-muted-foreground">
                          {version.changelog}
                        </pre>
                      ) : null}
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <a
                          href={`${API_BASE}/v1/extensions/${encodeURIComponent(ext.ext_id)}/download?version=${encodeURIComponent(version.version_code)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="size-4" /> Download .kodaext
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ExternalLink className="size-3.5" />
                Open the KodaHosting app → Extensions → Discover to see it in the app.
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
