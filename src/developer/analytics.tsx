import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileDown,
  Loader2,
  Package,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { DevExtension } from "@/developer/types";
import { formatBytes, formatDate, formatDateTime, latestVersion, pendingVersion } from "@/developer/types";
import { cn } from "@/lib/utils";

interface DailyRow {
  extension_id: string;
  version_code: number;
  day: string;
  downloads: number;
}

interface VersionRow {
  extension_id: string;
  version_code: number;
  downloads: number;
  first_at: string;
  last_at: string;
}

interface DeviceRow {
  device_model: string;
  downloads: number;
  extensions: number;
}

interface OsRow {
  os_version: string;
  downloads: number;
}

interface AppVersionRow {
  app_version: number;
  downloads: number;
}

interface SourceRow {
  source: string;
  downloads: number;
}

interface AnalyticsData {
  days: number;
  tracking_since?: string | null;
  daily: DailyRow[];
  versions: VersionRow[];
  devices: DeviceRow[];
  os_versions: OsRow[];
  app_versions: AppVersionRow[];
  sources: SourceRow[];
}

const RANGES = [7, 30, 90, 365] as const;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastDays(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - index);
    out.push(dayKey(date));
  }
  return out;
}

function medianHours(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function listingScore(ext: DevExtension): number {
  let score = 0;
  if (ext.name.trim().length >= 2) score += 10;
  if ((ext.summary || "").trim().length >= 20) score += 15;
  if ((ext.description || "").trim().length >= 80) score += 15;
  if ((ext.license || "").trim()) score += 10;
  if ((ext.category || "").trim()) score += 5;
  if (ext.icon_url) score += 15;
  const shots = ext.screenshots?.length || 0;
  if (shots >= 1) score += 15;
  if (shots >= 3) score += 5;
  if ((ext.source_url || "").trim()) score += 5;
  if ((ext.homepage_url || "").trim()) score += 5;
  return Math.min(100, score);
}

function DownloadChart({ days, daily }: { days: string[]; daily: DailyRow[] }) {
  const byDay = new Map<string, number>();
  for (const row of daily) byDay.set(row.day, (byDay.get(row.day) || 0) + row.downloads);
  const points = days.map((day) => ({ day, value: byDay.get(day) || 0 }));
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 640;
  const height = 180;
  const pad = 26;
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: pad + index * step,
    y: height - pad - (point.value / max) * (height - pad * 2),
    ...point,
  }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = coords.length
    ? `${line} L ${coords[coords.length - 1].x.toFixed(1)},${height - pad} L ${coords[0].x.toFixed(1)},${height - pad} Z`
    : "";
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Downloads per day">
      {[0, 0.5, 1].map((fraction) => {
        const y = height - pad - fraction * (height - pad * 2);
        return (
          <g key={fraction}>
            <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
            <text x={width - pad + 2} y={y + 3} className="fill-muted-foreground text-[9px]" textAnchor="start">
              {Math.round(max * fraction)}
            </text>
          </g>
        );
      })}
      {area ? <path d={area} className="fill-brand/15" /> : null}
      {line ? <path d={line} fill="none" className="stroke-brand" strokeWidth={2} strokeLinejoin="round" /> : null}
      {coords.map((point, index) =>
        index % labelEvery === 0 || index === coords.length - 1 ? (
          <text
            key={point.day}
            x={point.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {point.day.slice(5)}
          </text>
        ) : null,
      )}
      {coords.map((point) =>
        point.value > 0 && points.length <= 90 ? (
          <circle key={`dot-${point.day}`} cx={point.x} cy={point.y} r={3} className="fill-brand">
            <title>
              {point.day}: {point.value} downloads
            </title>
          </circle>
        ) : null,
      )}
    </svg>
  );
}

function MonthlyBars({ versions }: { versions: DevExtension["versions"] }) {
  const months: string[] = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  const counts = new Map<string, number>();
  for (const version of versions) {
    if (!version.created_at) continue;
    const key = version.created_at.slice(0, 7);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const max = Math.max(1, ...months.map((month) => counts.get(month) || 0));
  return (
    <div className="flex h-28 items-end gap-3">
      {months.map((month) => {
        const value = counts.get(month) || 0;
        return (
          <div key={month} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{value}</span>
            <div className="flex h-20 w-full items-end rounded-sm bg-muted/40">
              <div
                className={cn("w-full rounded-sm bg-brand", value === 0 && "opacity-0")}
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DeveloperAnalytics({ extensions }: { extensions: DevExtension[] }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (range: number) => {
    setLoading(true);
    setError("");
    api<{ analytics: AnalyticsData }>(`/v1/me/analytics?days=${range}`)
      .then((result) => setData(result.analytics))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api<{ analytics: AnalyticsData }>(`/v1/me/analytics?days=${days}`)
      .then((result) => {
        if (!cancelled) setData(result.analytics);
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
  }, [days]);

  const extById = useMemo(() => {
    const map = new Map<string, DevExtension>();
    for (const ext of extensions) {
      if (ext.id) map.set(ext.id, ext);
    }
    return map;
  }, [extensions]);

  const dailyDays = useMemo(() => lastDays(days), [days]);
  const rangeDownloads = (data?.daily || []).reduce((sum, row) => sum + row.downloads, 0);
  const lifetimeDownloads = extensions.reduce((sum, ext) => sum + (ext.downloads || 0), 0);
  const allVersions = extensions.flatMap((ext) => ext.versions);
  const approved = allVersions.filter((version) => version.status === "APPROVED").length;
  const rejected = allVersions.filter((version) => version.status === "REJECTED").length;
  const pending = allVersions.filter((version) => version.status === "PENDING").length;
  const approvalRate = approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : null;
  const reviewHours = medianHours(
    allVersions
      .filter((version) => version.created_at && version.reviewed_at)
      .map((version) => (Date.parse(version.reviewed_at!) - Date.parse(version.created_at!)) / 3600000)
      .filter((value) => Number.isFinite(value) && value >= 0),
  );
  const packageBytes = allVersions.reduce((sum, version) => sum + (version.file_size || 0), 0);

  const permissions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ext of extensions) {
      const latest = latestVersion(ext);
      for (const permission of latest?.permissions || []) {
        counts.set(permission, (counts.get(permission) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [extensions]);

  const stale = extensions.filter((ext) => {
    const latest = latestVersion(ext);
    if (!latest?.created_at || ext.status !== "APPROVED") return false;
    return Date.now() - Date.parse(latest.created_at) > 90 * 86400000;
  });

  const versionDownloads = new Map<string, number>();
  for (const row of data?.versions || []) versionDownloads.set(`${row.extension_id}:${row.version_code}`, row.downloads);

  function exportCsv() {
    const header = ["extension_id", "name", "version", "version_code", "status", "file_size", "created_at", "reviewed_at", "downloads_in_range", "lifetime_downloads"];
    const rows = extensions.flatMap((ext) =>
      ext.versions.map((version) => [
        ext.ext_id,
        ext.name,
        version.version,
        version.version_code,
        version.status,
        version.file_size ?? 0,
        version.created_at ?? "",
        version.reviewed_at ?? "",
        versionDownloads.get(`${ext.id}:${version.version_code}`) ?? 0,
        ext.downloads ?? 0,
      ]),
    );
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `koda-extensions-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store downloads, version adoption and review health. App updates inside KodaHosting are not
            downloads.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  days === range
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range}d
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={extensions.length === 0}>
            <FileDown className="size-4" /> CSV
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="gap-3 p-5 shadow-none">
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={() => load(days)}>
            Try again
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-0 p-5 shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Downloads · {days}d
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {loading ? "…" : rangeDownloads.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data?.tracking_since
                  ? `tracked since ${formatDate(data.tracking_since)}`
                  : "tracking starts with the next download"}
              </p>
            </div>
            <Download className="size-4 text-sky-500" />
          </div>
        </Card>
        <Card className="gap-0 p-5 shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Lifetime downloads
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {lifetimeDownloads.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">all time counter</p>
            </div>
            <TrendingUp className="size-4 text-violet-500" />
          </div>
        </Card>
        <Card className="gap-0 p-5 shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Approval rate
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {approvalRate == null ? "—" : `${approvalRate}%`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {approved} approved · {rejected} rejected · {pending} pending
              </p>
            </div>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
        </Card>
        <Card className="gap-0 p-5 shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Median review time
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {reviewHours == null
                  ? "—"
                  : reviewHours < 24
                    ? `${reviewHours.toFixed(1)} h`
                    : `${(reviewHours / 24).toFixed(1)} d`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{allVersions.length} releases total</p>
            </div>
            <Star className="size-4 text-amber-500" />
          </div>
        </Card>
      </div>

      <Card className="gap-0 p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Downloads per day</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One point per day, summed over all your extensions.
            </p>
          </div>
          <Badge variant="outline" className="font-normal">
            {days} days
          </Badge>
        </div>
        <div className="mt-5 text-muted-foreground">
          {loading ? (
            <p className="flex items-center gap-2 py-10 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading downloads…
            </p>
          ) : rangeDownloads === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm">
              No downloads recorded in this range yet. The daily curve starts with the next store
              download.
            </p>
          ) : (
            <DownloadChart days={dailyDays} daily={data?.daily || []} />
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Downloads per extension</h2>
          {extensions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {[...extensions]
                .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
                .map((ext) => {
                  const max = Math.max(1, ...extensions.map((item) => item.downloads || 0));
                  return (
                    <li key={ext.ext_id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{ext.name}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {(ext.downloads || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.round(((ext.downloads || 0) / max) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>

        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Version adoption · {days}d</h2>
          <p className="mt-1 text-sm text-muted-foreground">Which release users install.</p>
          {versionDownloads.size === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No version data in this range.
            </p>
          ) : (
            <ul className="mt-4 divide-y">
              {[...versionDownloads.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, downloads]) => {
                  const [extId, code] = key.split(":");
                  const ext = extById.get(extId);
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate">
                        {ext?.name || "Extension"} <span className="font-mono text-xs text-muted-foreground">({code})</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {downloads.toLocaleString()}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Devices · {days}d</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Which phones and tablets install your extensions. Sent by the app with the download,
            never linked to an account.
          </p>
          {!data?.devices?.length ? (
            <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No device data in this range yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.devices.slice(0, 8).map((device, index) => {
                const maxDevice = Math.max(1, ...data.devices.map((entry) => entry.downloads));
                const share = rangeDownloads > 0 ? Math.round((device.downloads / rangeDownloads) * 100) : 0;
                const colors = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500"];
                return (
                  <li key={device.device_model}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{device.device_model}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {device.downloads.toLocaleString()} · {share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${colors[index % colors.length]}`}
                        style={{ width: `${Math.max(4, Math.round((device.downloads / maxDevice) * 100))}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Platforms and app builds</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            App store downloads versus the website, plus the Android and app versions in use.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(data?.sources || []).map((source) => (
              <Badge key={source.source} variant="outline" className="font-normal">
                {source.source === "app" ? "In-app store" : "Website"} · {source.downloads}
              </Badge>
            ))}
            {!data?.sources?.length ? (
              <span className="text-xs text-muted-foreground">No downloads yet.</span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Android
              </p>
              {data?.os_versions?.length ? (
                <ul className="mt-2 space-y-1.5">
                  {data.os_versions.slice(0, 6).map((row) => (
                    <li key={row.os_version} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{row.os_version}</span>
                      <span className="shrink-0 font-mono text-muted-foreground">{row.downloads}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                App builds
              </p>
              {data?.app_versions?.length ? (
                <ul className="mt-2 space-y-1.5">
                  {data.app_versions.slice(0, 6).map((row) => (
                    <li key={row.app_version} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">Build {row.app_version}</span>
                      <span className="shrink-0 font-mono text-muted-foreground">{row.downloads}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Release cadence</h2>
          <p className="mt-1 text-sm text-muted-foreground">Uploads in the last six months.</p>
          <div className="mt-4">
            <MonthlyBars versions={allVersions} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="size-3.5" />
            {formatBytes(packageBytes)} of packages stored
          </p>
        </Card>

        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Listing health</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completeness of the store card. 100 means every field, icon and screenshot is filled.
          </p>
          {extensions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No extensions yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {extensions.map((ext) => {
                const score = listingScore(ext);
                return (
                  <li key={ext.ext_id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{ext.name}</span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs",
                          score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive",
                        )}
                      >
                        {score}/100
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive",
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Permissions in use</h2>
          <p className="mt-1 text-sm text-muted-foreground">Across the latest release of each extension.</p>
          {permissions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No permissions requested.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {permissions.map(([permission, count]) => (
                <li key={permission}>
                  <Badge variant="outline" className="font-mono font-normal">
                    {permission} <span className="ml-1 text-muted-foreground">×{count}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-0 p-5 shadow-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Stale extensions</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Published, but no release in the last 90 days.
          </p>
          {stale.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Everything is fresh.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stale.map((ext) => (
                <li key={ext.ext_id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs">
                  <span className="truncate">{ext.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    last {formatDateTime(latestVersion(ext)?.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {extensions.some((ext) => pendingVersion(ext)) ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Some extensions have a release waiting for review.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
