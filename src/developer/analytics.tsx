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
import { AnimatedSwitch } from "@/components/animated-switch";
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
            <line
              x1={pad}
              x2={width - pad}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-zinc-200 dark:text-white/[0.08]"
              strokeDasharray="3 4"
            />
            <text x={width - pad + 4} y={y + 3} className="fill-zinc-500 font-mono text-[9px]" textAnchor="start">
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
            className="fill-zinc-500 font-mono text-[9px]"
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
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">{value}</span>
            <div className="flex h-20 w-full items-end rounded-md bg-zinc-100 dark:bg-white/[0.04]">
              <div
                className={cn("w-full rounded-md bg-brand", value === 0 && "opacity-0")}
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-zinc-500">{month.slice(5)}</span>
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
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Store downloads, version adoption, and review health. In-app auto-updates are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnimatedSwitch<string>
            ariaLabel="Analytics date range"
            size="sm"
            value={String(days)}
            onChange={(value) => setDays(Number(value) as (typeof RANGES)[number])}
            options={RANGES.map((range) => ({ id: String(range), label: `${range}d` }))}
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={extensions.length === 0}
            className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-45"
          >
            <FileDown className="size-3.5" /> CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="resend-glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button type="button" onClick={() => load(days)} className="koda-btn-pill h-8 px-3.5 text-xs">
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="resend-glass-panel rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                Downloads · {days}d
              </p>
              <p className="mt-2.5 font-display text-2xl font-medium tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-white">
                {loading ? "..." : rangeDownloads.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {data?.tracking_since
                  ? `Tracked since ${formatDate(data.tracking_since)}`
                  : "Starts with the next download"}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.05]">
              <Download className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                Lifetime downloads
              </p>
              <p className="mt-2.5 font-display text-2xl font-medium tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-white">
                {lifetimeDownloads.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">All-time counter</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.05]">
              <TrendingUp className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                Approval rate
              </p>
              <p className="mt-2.5 font-display text-2xl font-medium tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-white">
                {approvalRate == null ? "-" : `${approvalRate}%`}
              </p>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">
                {approved} ok · {rejected} rej · {pending} pending
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.05]">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                Median review time
              </p>
              <p className="mt-2.5 font-display text-2xl font-medium tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-white">
                {reviewHours == null
                  ? "-"
                  : reviewHours < 24
                    ? `${reviewHours.toFixed(1)} h`
                    : `${(reviewHours / 24).toFixed(1)} d`}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {allVersions.length} releases total
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.05]">
              <Star className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="resend-glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Downloads per day
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              One point per day, summed across all your extensions.
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-500">{days} days</span>
        </div>
        <div className="mt-5 text-zinc-500">
          {loading ? (
            <p className="flex items-center gap-2 py-10 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="size-4 animate-spin" /> Loading downloads...
            </p>
          ) : rangeDownloads === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-white/[0.1] dark:text-zinc-400">
              No downloads recorded in this range yet. The daily curve starts with the next store download.
            </p>
          ) : (
            <DownloadChart days={dailyDays} daily={data?.daily || []} />
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Downloads per extension
          </h2>
          {extensions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No data yet.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {[...extensions]
                .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
                .map((ext) => {
                  const max = Math.max(1, ...extensions.map((item) => item.downloads || 0));
                  return (
                    <li key={ext.ext_id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-zinc-950 dark:text-white">{ext.name}</span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                          {(ext.downloads || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
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
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Version adoption · {days}d
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Which release users install.</p>
          {versionDownloads.size === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-white/[0.1] dark:text-zinc-400">
              No version data in this range.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
              {[...versionDownloads.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, downloads]) => {
                  const [extId, code] = key.split(":");
                  const ext = extById.get(extId);
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100">
                        {ext?.name || "Extension"}{" "}
                        <span className="font-mono text-xs text-zinc-500">({code})</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                        {downloads.toLocaleString()}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Devices · {days}d
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Phones and tablets installing your extensions. Sent anonymously with the download.
          </p>
          {!data?.devices?.length ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-white/[0.1] dark:text-zinc-400">
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
                      <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100">{device.device_model}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                        {device.downloads.toLocaleString()} · {share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
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
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Platforms and app builds
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            In-app store versus website downloads, plus Android and app versions in use.
          </p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-zinc-200/70 pb-3.5 font-mono text-xs dark:border-white/[0.06]">
            {(data?.sources || []).map((source) => (
              <span key={source.source} className="text-zinc-700 dark:text-zinc-300">
                {source.source === "app" ? "In-app store" : "Website"}:{" "}
                <span className="font-medium text-zinc-950 tabular dark:text-white">{source.downloads}</span>
              </span>
            ))}
            {!data?.sources?.length ? (
              <span className="text-zinc-500">No downloads yet.</span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                Android
              </p>
              {data?.os_versions?.length ? (
                <ul className="mt-2 space-y-1.5">
                  {data.os_versions.slice(0, 6).map((row) => (
                    <li key={row.os_version} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-zinc-800 dark:text-zinc-200">{row.os_version}</span>
                      <span className="shrink-0 font-mono tabular-nums text-zinc-500">{row.downloads}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-mono text-xs text-zinc-500">-</p>
              )}
            </div>
            <div>
              <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
                App builds
              </p>
              {data?.app_versions?.length ? (
                <ul className="mt-2 space-y-1.5">
                  {data.app_versions.slice(0, 6).map((row) => (
                    <li key={row.app_version} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-zinc-800 dark:text-zinc-200">Build {row.app_version}</span>
                      <span className="shrink-0 font-mono tabular-nums text-zinc-500">{row.downloads}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-mono text-xs text-zinc-500">-</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Release cadence
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Uploads in the last six months.</p>
          <div className="mt-4">
            <MonthlyBars versions={allVersions} />
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-xs text-zinc-500">
            <Package className="size-3.5" />
            {formatBytes(packageBytes)} of packages stored
          </p>
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Listing health
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Completeness of each store card. 100 means every field, icon, and screenshot is set.
          </p>
          {extensions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No extensions yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {extensions.map((ext) => {
                const score = listingScore(ext);
                return (
                  <li key={ext.ext_id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-zinc-950 dark:text-white">{ext.name}</span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs tabular-nums",
                          score >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : score >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {score}/100
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          score >= 80
                            ? "bg-emerald-500"
                            : score >= 50
                              ? "bg-amber-500"
                              : "bg-red-500",
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="resend-glass-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Permissions in use
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Across the latest release of each extension.
          </p>
          {permissions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No permissions requested.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
              {permissions.map(([permission, count]) => (
                <li key={permission} className="flex items-center justify-between py-2 font-mono text-xs">
                  <span className="text-zinc-900 dark:text-zinc-200">{permission}</span>
                  <span className="tabular-nums text-zinc-500">x{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="resend-glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-zinc-500" />
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Stale extensions
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Published, with no release in the last 90 days.
          </p>
          {stale.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Everything is fresh.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
              {stale.map((ext) => (
                <li key={ext.ext_id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{ext.name}</span>
                  <span className="shrink-0 font-mono text-zinc-500">
                    last {formatDateTime(latestVersion(ext)?.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {extensions.some((ext) => pendingVersion(ext)) ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Some extensions have a release waiting for review.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
