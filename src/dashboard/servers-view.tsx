import type { ReactNode } from "react";
import { Database, ExternalLink, Play, RotateCw, Server, Square } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/reveal";
import { relativeTime } from "@/lib/format";
import type { AppStateDetails, ServerRow, StatusDetails } from "@/lib/server-status";
import { getStatusDetails, isDatabase, versionLabel } from "@/lib/server-status";
import { cn } from "@/lib/utils";

type Feedback = { tone: "ok" | "err"; text: string };
type Command = "start" | "restart" | "stop";

const TONE_CLASS: Record<string, string> = {
  online: "tone-online",
  pending: "tone-pending",
  offline: "border-border bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: StatusDetails }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", TONE_CLASS[status.tone])}>
      <span className="size-1.5 rounded-full bg-current" />
      {status.label}
    </Badge>
  );
}

export function AppStatusCard({ status }: { status: AppStateDetails | null }) {
  const tone = status?.tone ?? "offline";
  const color =
    tone === "online" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-zinc-400";

  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full", color)} />
        <span className="text-[13px] font-medium">{status?.badge ?? "OFFLINE"}</span>
      </div>
      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
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
  const ramPct =
    row.total_ram_mb && row.ram_mb
      ? Math.min(100, Math.round((row.ram_mb / row.total_ram_mb) * 100))
      : 0;

  return (
    <Card className="relative h-full gap-0 overflow-hidden bg-[#1a1310] p-0">
      <span className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-brand" />
      <div className="p-5 pl-6">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              database ? "bg-[#2a1a12] text-brand-ink" : "bg-brand text-[#1a0f00]",
            )}
          >
            {database ? <Database className="size-5" /> : <Server className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-medium">{row.host}</div>
            {address !== row.host ? (
              <div className="truncate text-sm text-brand-ink">{address}</div>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-2">
              <StatusBadge status={status} />
              {row.is_guest === true ? (
                <Badge variant="outline" className="font-normal">
                  Shared
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {database ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Stat label="RAM">
              {row.ram_mb ? (
                <>
                  {row.ram_mb} <span className="text-sm text-muted-foreground">MB</span>
                </>
              ) : (
                "--"
              )}
            </Stat>
            <Stat label="Version">{versionLabel(row.server_version)}</Stat>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-[13px] text-brand-ink">Players</div>
                <div className="mt-1 text-4xl font-medium tracking-[-0.04em]">
                  {row.online_players || 0}
                  <span className="text-xl text-muted-foreground"> / {row.max_players || 0}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] text-brand-ink">RAM</div>
                <div className="mt-1 text-base font-medium">
                  {row.ram_mb ? `${row.ram_mb} MB` : "--"}
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  {versionLabel(row.server_version)}
                </div>
              </div>
            </div>
            {ramPct > 0 ? (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#2a1a12]">
                <div className="h-full rounded-full bg-brand" style={{ width: `${ramPct}%` }} />
              </div>
            ) : null}
          </>
        )}

        {database ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Databases are managed in the KodaHosting app.
          </p>
        ) : (
          <>
            {!hasDash ? (
              <p className="mt-4 text-sm leading-6 text-warn">
                KodaDash is not enabled for this server.
              </p>
            ) : !online ? (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                The tunnel only exists while the server is running.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-lg bg-brand text-[#1a0f00] hover:bg-brand/90"
                disabled={busy}
                onClick={() => onCommand(row, "start")}
              >
                <Play className="size-3.5" /> Start
              </Button>
              <Button
                size="sm"
                className="rounded-lg bg-amber-500 text-[#1a0f00] hover:bg-amber-500/90"
                disabled={busy}
                onClick={() => onCommand(row, "restart")}
              >
                <RotateCw className="size-3.5" /> Restart
              </Button>
              <Button
                size="sm"
                className="rounded-lg bg-red-600 text-white hover:bg-red-600/90"
                disabled={busy}
                onClick={() => onCommand(row, "stop")}
              >
                <Square className="size-3.5" /> Stop
              </Button>
              {hasDash && online ? (
                <Button
                  size="sm"
                  className="rounded-lg bg-white text-black hover:bg-white/90"
                  disabled={busy}
                  onClick={() => onOpenDash(row)}
                >
                  <ExternalLink className="size-3.5" /> Open KodaDash
                </Button>
              ) : null}
            </div>
          </>
        )}

        {feedback ? (
          <p className={cn("mt-3 text-sm", feedback.tone === "ok" ? "text-ok" : "text-destructive")}>
            {feedback.text}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-[#241a15] px-4 py-3">
      <div className="text-[13px] text-brand-ink">{label}</div>
      <div className="mt-1 text-lg font-medium tracking-tight">{children}</div>
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
    <Card className="gap-0 p-6 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">This device</h3>
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
          <div className="mt-1 text-lg font-semibold">{total ? `${usedPct}%` : "--"}</div>
          <Progress value={usedPct} className="mt-2 h-1" />
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
    </Card>
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minecraft Servers</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Starting, stopping and the console happen here. Everything else lives in the KodaHosting app.
        </p>
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
        <Alert variant="destructive">
          <AlertTitle>Could not load the servers</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            {error}
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MariaDB Databases</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Databases run next to your Minecraft servers and are created in the app.
        </p>
      </div>

      {databases.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center text-sm text-muted-foreground">
          No databases yet. Create one in the KodaHosting app.
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
