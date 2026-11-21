import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Database,
  Play,
  RotateCw,
  Server,
  Square,
  Terminal,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { Reveal } from "@/components/reveal";
import { copyText, relativeTime } from "@/lib/format";
import type { AppStateDetails, ServerRow, StatusDetails } from "@/lib/server-status";
import { getStatusDetails, isDatabase, versionLabel } from "@/lib/server-status";
import { cn } from "@/lib/utils";

type Feedback = { tone: "ok" | "err"; text: string };
type Command = "start" | "restart" | "stop";

const STATUS_STYLE: Record<StatusDetails["tone"], { dot: string; text: string; pill: string }> = {
  online: { dot: "bg-emerald-400", text: "text-emerald-300", pill: "bg-emerald-400/10" },
  pending: { dot: "bg-amber-400", text: "text-amber-300", pill: "bg-amber-400/10" },
  offline: { dot: "bg-zinc-500", text: "text-zinc-400", pill: "bg-white/[0.04]" },
};

function StatusPill({ status }: { status: StatusDetails }) {
  const style = STATUS_STYLE[status.tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium",
        style.pill,
        style.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {status.label}
    </span>
  );
}

function CopyAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!(await copyText(value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      title="Copy address"
      className="shrink-0 rounded p-0.5 text-zinc-600 transition-colors hover:text-zinc-300 focus-visible:text-zinc-300 focus-visible:outline-none"
    >
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
    </button>
  );
}

function memoryLabel(mb?: number): string {
  if (!mb) return "--";
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 flex h-6 items-center truncate text-[15px] font-medium tabular-nums text-zinc-200">
        {children}
      </div>
    </div>
  );
}

export function AppStatusCard({ status }: { status: AppStateDetails | null }) {
  const tone = status?.tone ?? "offline";
  const color =
    tone === "online" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : "bg-zinc-600";

  return (
    <div className="rounded-xl bg-[#09090b] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full", color)} />
        <span className="font-mono text-[11px] font-medium tracking-[0.04em] text-zinc-200 uppercase">
          {status?.badge ?? "OFFLINE"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">
        {status?.description ?? "Not connected"}
      </p>
    </div>
  );
}

function ServerCard({
  row,
  busy,
  feedback,
  onCommand,
  onOpenDash,
}: {
  row: ServerRow;
  busy: boolean;
  feedback?: Feedback;
  onCommand: (row: ServerRow, action: Command) => void;
  onOpenDash: (row: ServerRow) => void;
}) {
  const status = getStatusDetails(row.server_version);
  const database = isDatabase(row);
  const hasDash = Number(row.kodadash_port) > 0;
  const online = status.tone === "online";
  const address = row.base_domain ? `${row.host}.${row.base_domain}` : row.host;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[#09090b] transition-colors hover:bg-white/[0.04]">
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                database
                  ? "border-border bg-secondary text-muted-foreground"
                  : "border-brand/20 bg-brand/[0.08] text-brand-ink",
              )}
            >
              {database ? (
                <Database className="size-4" strokeWidth={1.75} />
              ) : (
                <Server className="size-4" strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                  {row.host}
                </h3>
                {row.is_guest === true ? (
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Shared
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
                <span className="truncate">{address}</span>
                <CopyAddress value={address} />
              </div>
            </div>
          </div>
          <StatusPill status={status} />
        </div>

        <div className={cn("mt-5 grid gap-4", database ? "grid-cols-2" : "grid-cols-3")}>
          {database ? null : (
            <Metric label="Players">
              <span className="text-foreground">{row.online_players ?? 0}</span>
              <span className="text-muted-foreground"> / {row.max_players || 0}</span>
            </Metric>
          )}
          <Metric label="Memory">{memoryLabel(row.ram_mb)}</Metric>
          <Metric label="Version">
            <span className="truncate">{versionLabel(row.server_version)}</span>
          </Metric>
        </div>

        {feedback ? (
          <p
            className={cn(
              "mt-3.5 text-xs",
              feedback.tone === "ok" ? "text-ok" : "text-danger",
            )}
          >
            {feedback.text}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-white/[0.02] px-3 py-2 sm:px-4">
        {database ? (
          <span className="px-1 text-[11px] text-zinc-500">Managed in the KodaHosting app</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onCommand(row, "start")}
              className={cn(
                "h-7 gap-1.5 rounded-full px-2.5 text-[12px]",
                !online
                  ? "bg-white/[0.12] text-white hover:bg-white/[0.18]"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Play className="size-3.5" /> Start
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onCommand(row, "restart")}
              className="h-7 gap-1.5 rounded-full px-2.5 text-[12px] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            >
              <RotateCw className="size-3.5" /> Restart
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onCommand(row, "stop")}
              className="h-7 gap-1.5 rounded-full px-2.5 text-[12px] text-red-400 hover:bg-red-500/15 hover:text-red-300"
            >
              <Square className="size-3.5" /> Stop
            </Button>
          </div>
        )}

        {database ? null : hasDash ? (
          <div className="flex items-center gap-1">
            <a
              href={`/mcp?server=${encodeURIComponent(row.host)}`}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Set up KodaDash MCP for this server"
            >
              <Terminal className="size-3" /> MCP
            </a>
            {online ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onOpenDash(row)}
                className="h-7 gap-1 rounded-full px-2.5 text-[12px] text-brand-ink hover:bg-brand/10 hover:text-brand"
              >
                KodaDash <ArrowUpRight className="size-3.5" />
              </Button>
            ) : (
              <span
                className="px-1 text-[11px] text-muted-foreground"
                title="KodaDash is reachable while the server is running"
              >
                KodaDash offline
              </span>
            )}
          </div>
        ) : (
          <span
            className="px-1 text-[11px] text-muted-foreground"
            title="Enable KodaDash in the KodaHosting app"
          >
            KodaDash not set up
          </span>
        )}
      </div>
    </div>
  );
}

export function DeviceCard({ rows }: { rows: ServerRow[] }) {
  const row = rows.find((item) => item.total_ram_mb) || rows.find((item) => item.device_model);
  if (!row) return null;

  const total = row.total_ram_mb || 0;
  const free = row.free_ram_mb || 0;
  const usedPct = total > 0 ? Math.min(100, Math.round(((total - free) / total) * 100)) : 0;
  const age = row.app_last_ping
    ? (Date.now() - new Date(row.app_last_ping).getTime()) / 1000
    : Infinity;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">This device</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live values reported by the KodaHosting app on your phone
          </p>
        </div>
        <span className={cn("text-xs", age < 60 ? "text-ok" : "text-muted-foreground")}>
          {age < 60 ? "live" : `last seen ${relativeTime(row.app_last_ping)}`}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <div className="text-xs text-muted-foreground">Memory</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{total ? `${usedPct}%` : "--"}</div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {total ? `${total - free} MB of ${total} MB` : "not reported"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Battery</div>
          <div className="mt-1 text-lg font-semibold">
            {row.battery_level != null ? `${row.battery_level}%` : "--"}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {row.is_charging ? "charging" : "on battery"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">CPU</div>
          <div className="mt-1 text-lg font-semibold">
            {row.cpu_cores ? `${row.cpu_cores} cores` : "--"}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">{row.network_type || ""}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Device</div>
          <div className="mt-1 truncate text-sm font-semibold">{row.device_model || "--"}</div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {[row.os_version, row.screen_resolution].filter(Boolean).join(" - ")}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">App</div>
          <div className="mt-1 text-sm font-semibold">{row.app_version || "--"}</div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {row.app_state === "FOREGROUND"
              ? "active on the device"
              : row.app_state === "BACKGROUND"
                ? "running in the background"
                : "not connected"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Last report</div>
          <div className="mt-1 text-sm font-semibold">{relativeTime(row.app_last_ping)}</div>
        </div>
      </div>
    </div>
  );
}

export function ServersView({
  rows,
  error,
  busyHost,
  feedback,
  inviteBanner,
  onCommand,
  onOpenDash,
  onRetry,
  onDismissInvite,
}: {
  rows: ServerRow[];
  error: string;
  busyHost: string | null;
  feedback: Record<string, Feedback>;
  inviteBanner: Feedback | null;
  onCommand: (row: ServerRow, action: Command) => void;
  onOpenDash: (row: ServerRow) => void;
  onRetry: () => void;
  onDismissInvite: () => void;
}) {
  const servers = rows.filter((row) => !isDatabase(row));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minecraft Servers</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Starting, stopping and the console happen here. Everything else lives in the KodaHosting app.
          </p>
        </div>
        {!error && servers.length > 0 ? (
          <span className="pb-1 text-xs tabular-nums text-zinc-500">
            {servers.length} {servers.length === 1 ? "server" : "servers"}
          </span>
        ) : null}
      </div>

      {inviteBanner ? (
        <Alert className={inviteBanner.tone === "ok" ? "tone-online" : undefined} variant={inviteBanner.tone === "ok" ? "default" : "destructive"}>
          <AlertTitle>{inviteBanner.tone === "ok" ? "Invite accepted" : "The invite could not be used"}</AlertTitle>
          <AlertDescription className="flex items-start justify-between gap-4">
            <span>{inviteBanner.text}</span>
            <Button variant="ghost" size="sm" onClick={onDismissInvite}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <ErrorState
          code="SYNC ERROR"
          title="Could not load your servers"
          description="We could not reach the KodaHosting backend to refresh your server list."
          detail={error}
          onRetry={onRetry}
        />
      ) : null}

      {!error && servers.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center">
          <Server className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No servers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create one in the KodaHosting app. It appears here with its address and controls.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {servers.map((row, index) => (
            <Reveal key={row.id || row.host} delay={Math.min(index * 60, 240)} className="h-full">
              <ServerCard
                row={row}
                busy={busyHost === row.host}
                feedback={feedback[row.host]}
                onCommand={onCommand}
                onOpenDash={onOpenDash}
              />
            </Reveal>
          ))}
        </div>
      )}

      <DeviceCard rows={rows} />
    </div>
  );
}

export function DatabasesView({ rows }: { rows: ServerRow[] }) {
  const databases = rows.filter(isDatabase);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MariaDB Databases</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Databases run next to your Minecraft servers and are created in the app.
          </p>
        </div>
        {databases.length > 0 ? (
          <span className="pb-1 text-xs tabular-nums text-zinc-500">
            {databases.length} {databases.length === 1 ? "database" : "databases"}
          </span>
        ) : null}
      </div>

      {databases.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center text-sm text-muted-foreground">
          No databases yet. Create one in the KodaHosting app.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {databases.map((row, index) => (
            <Reveal key={row.id || row.host} delay={Math.min(index * 60, 240)} className="h-full">
              <ServerCard
                row={row}
                busy={false}
                onCommand={() => {}}
                onOpenDash={() => {}}
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
