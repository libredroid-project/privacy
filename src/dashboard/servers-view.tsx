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

const STATUS_STYLE: Record<StatusDetails["tone"], { dot: string; text: string }> = {
  online: { dot: "bg-emerald-400", text: "text-emerald-400" },
  pending: { dot: "bg-amber-400", text: "text-amber-300" },
  offline: { dot: "bg-zinc-500", text: "text-zinc-400" },
};

function StatusIndicator({ status }: { status: StatusDetails }) {
  const style = STATUS_STYLE[status.tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.02em]",
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
      className="shrink-0 rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:text-zinc-200 focus-visible:outline-none"
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
      <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">{label}</div>
      <div className="mt-1 flex h-6 items-center truncate font-mono text-[14px] font-medium tabular-nums text-zinc-100">
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
    <div className="resend-glass-panel rounded-xl p-3">
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
    <div className="resend-glass-panel flex h-full flex-col overflow-hidden rounded-2xl transition-colors hover:bg-white/[0.03]">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                database
                  ? "bg-white/[0.05] text-zinc-400"
                  : "bg-brand/10 text-brand-ink",
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
                <h3 className="truncate font-display text-[15px] font-medium tracking-[-0.015em] text-white">
                  {row.host}
                </h3>
                {row.is_guest === true ? (
                  <span className="shrink-0 font-mono text-[10.5px] text-zinc-500">
                    · Shared
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-xs text-zinc-400">
                <span className="truncate">{address}</span>
                <CopyAddress value={address} />
              </div>
            </div>
          </div>
          <StatusIndicator status={status} />
        </div>

        <div className={cn("mt-5 grid gap-4 border-t border-white/[0.06] pt-4", database ? "grid-cols-2" : "grid-cols-3")}>
          {database ? null : (
            <Metric label="Players">
              <span className="text-white">{row.online_players ?? 0}</span>
              <span className="text-zinc-500"> / {row.max_players || 0}</span>
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
              feedback.tone === "ok" ? "text-emerald-400" : "text-red-400",
            )}
          >
            {feedback.text}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
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
                className="px-1 text-[11px] text-zinc-500"
                title="KodaDash is reachable while the server is running"
              >
                KodaDash offline
              </span>
            )}
          </div>
        ) : (
          <span
            className="px-1 text-[11px] text-zinc-500"
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
    <div className="resend-glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
        <div>
          <h3 className="font-display text-sm font-medium text-white">Host device</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Live telemetry reported by the KodaHosting app on your phone.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-[11px]",
            age < 60 ? "text-emerald-400" : "text-zinc-500",
          )}
        >
          <span className={cn("size-1.5 rounded-full", age < 60 ? "bg-emerald-400" : "bg-zinc-600")} />
          {age < 60 ? "Live" : `Last seen ${relativeTime(row.app_last_ping)}`}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">Memory</div>
          <div className="mt-1 font-mono text-lg font-medium tabular-nums text-white">
            {total ? `${usedPct}%` : "--"}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="mt-1.5 font-mono text-[11px] tabular-nums text-zinc-500">
            {total ? `${total - free} / ${total} MB` : "not reported"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">Battery</div>
          <div className="mt-1 font-mono text-lg font-medium tabular-nums text-white">
            {row.battery_level != null ? `${row.battery_level}%` : "--"}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-500">
            {row.is_charging ? "Charging" : "On battery"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">CPU</div>
          <div className="mt-1 font-mono text-lg font-medium tabular-nums text-white">
            {row.cpu_cores ? `${row.cpu_cores} cores` : "--"}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-500">{row.network_type || ""}</div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">Device</div>
          <div className="mt-1 truncate text-sm font-medium text-white">{row.device_model || "--"}</div>
          <div className="mt-1.5 text-[11px] text-zinc-500">
            {[row.os_version, row.screen_resolution].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">App</div>
          <div className="mt-1 font-mono text-sm font-medium text-white">{row.app_version || "--"}</div>
          <div className="mt-1.5 text-[11px] text-zinc-500">
            {row.app_state === "FOREGROUND"
              ? "Active on device"
              : row.app_state === "BACKGROUND"
                ? "Running in background"
                : "Not connected"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">Last report</div>
          <div className="mt-1 text-sm font-medium text-white">{relativeTime(row.app_last_ping)}</div>
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
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">
            Minecraft Servers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Start, restart, stop, and jump into KodaDash from here. Everything else lives in the KodaHosting app.
          </p>
        </div>
        {!error && servers.length > 0 ? (
          <span className="pb-1 font-mono text-xs tabular-nums text-zinc-500">
            {servers.length} {servers.length === 1 ? "server" : "servers"}
          </span>
        ) : null}
      </div>

      {inviteBanner ? (
        <Alert
          className={
            inviteBanner.tone === "ok"
              ? "rounded-2xl border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "rounded-2xl"
          }
          variant={inviteBanner.tone === "ok" ? "default" : "destructive"}
        >
          <AlertTitle>{inviteBanner.tone === "ok" ? "Invite accepted" : "The invite could not be used"}</AlertTitle>
          <AlertDescription className="flex items-start justify-between gap-4">
            <span>{inviteBanner.text}</span>
            <Button variant="ghost" size="sm" onClick={onDismissInvite} className="h-7 rounded-full px-3 text-xs">
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
        <div className="resend-glass-panel rounded-2xl p-12 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
            <Server className="size-5" />
          </div>
          <p className="font-display text-sm font-medium text-white">No servers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">
            Create one in the KodaHosting app. It appears here with its join address and controls.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">
            MariaDB Databases
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Databases run right alongside your Minecraft servers and are created in the app.
          </p>
        </div>
        {databases.length > 0 ? (
          <span className="pb-1 font-mono text-xs tabular-nums text-zinc-500">
            {databases.length} {databases.length === 1 ? "database" : "databases"}
          </span>
        ) : null}
      </div>

      {databases.length === 0 ? (
        <div className="resend-glass-panel rounded-2xl p-12 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
            <Database className="size-5" />
          </div>
          <p className="font-display text-sm font-medium text-white">No databases yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">
            Create a MariaDB or Redis instance in the KodaHosting app and it will show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
