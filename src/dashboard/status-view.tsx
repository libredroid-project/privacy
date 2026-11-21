import { useEffect, useState } from "react";
import { Activity, Boxes, Loader2, Server, ShieldCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
import { Reveal } from "@/components/reveal";
import { publicApi } from "@/lib/api";
import { plural, relativeTime } from "@/lib/format";
import { safeMinecraftFavicon } from "@/lib/security";
import type { CommunityServer, PlatformStatus } from "@/dashboard/types";
import { cn } from "@/lib/utils";

function stripColors(text?: string): string {
  return (text || "").replace(/§./g, "");
}

function statusTone(status?: string): string {
  if (status === "ONLINE") return "tone-online";
  if (status === "HIBERNATED") return "tone-pending";
  return "border-border bg-muted text-muted-foreground";
}

function StatCard({
  icon: Icon,
  label,
  value,
  foot,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  foot: string;
  tone?: string;
}) {
  return (
    <Card className="gap-0 p-5 shadow-none">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className={cn("mt-3 text-xl font-semibold tracking-tight", tone)}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{foot}</div>
    </Card>
  );
}

export function StatusView() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const [community, setCommunity] = useState<CommunityServer[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    publicApi<PlatformStatus>("/v1/status")
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await publicApi<{ items?: CommunityServer[] }>("/v1/servers?limit=12");
        const items = data.items || [];
        if (cancelled) return;
        setCommunity(items);
        setCommunityLoading(false);

        const online = items.filter((item) => item.status === "ONLINE").slice(0, 8);
        const results = await Promise.allSettled(
          online.map((item) =>
            publicApi<{ server?: { live?: CommunityServer["live"] } }>(
              `/v1/servers/${encodeURIComponent(item.host)}`,
            ),
          ),
        );
        if (cancelled) return;
        const merged = items.map((item) => {
          const index = online.findIndex((entry) => entry.host === item.host);
          if (index < 0) return item;
          const result = results[index];
          if (result.status !== "fulfilled") return item;
          const live = result.value.server?.live;
          if (!live?.live) return item;
          return {
            ...item,
            live,
            players_online: live.players_online ?? item.players_online,
            players_max: live.players_max ?? item.players_max,
            motd: live.motd || item.motd,
          };
        });
        setCommunity(merged);
      } catch (err) {
        if (!cancelled) {
          setCommunityError((err as Error).message);
          setCommunityLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live values from api.kodanetwork.eu and the tunnel server.
          </p>
        </div>
        <ErrorState
          code="STATUS UNAVAILABLE"
          title="Live telemetry could not be loaded"
          description="We could not reach api.kodanetwork.eu right now."
          detail={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
        />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading the live values…
      </div>
    );
  }

  const vps = status.vps;
  const release = status.release;
  const maintenance = status.maintenance;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Live values from api.kodanetwork.eu and the tunnel server.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Activity}
          label="API"
          value={status.ok ? "Online" : "Down"}
          foot={`api.kodanetwork.eu · v${status.api?.version ?? "-"}`}
          tone={status.ok ? "text-ok" : "text-destructive"}
        />
        <StatCard
          icon={Server}
          label="Servers"
          value={String(status.servers?.total ?? 0)}
          foot={`${status.servers?.players_online ?? 0} players online`}
        />
        <StatCard
          icon={Boxes}
          label="Store"
          value={String(status.extensions?.published ?? 0)}
          foot={plural(status.extensions?.published ?? 0, "published extension")}
        />
        <StatCard
          icon={ShieldCheck}
          label="Tunnel server"
          value={vps ? (vps.stale ? "No fresh data" : "Online") : "No data"}
          foot={
            vps
              ? `load ${vps.load1 ?? "-"} · RAM ${vps.ram_used_pct ?? "-"}% · ${vps.open_tunnels ?? 0} tunnels · up ${Math.floor((vps.uptime_seconds || 0) / 86400)} d`
              : "not reported"
          }
          tone={vps && !vps.stale ? "text-ok" : undefined}
        />
        <StatCard
          icon={Activity}
          label="Latest release"
          value={release?.version_name || "-"}
          foot={release ? `${release.channel} · ${relativeTime(release.published_at)}` : "no release yet"}
        />
        <StatCard
          icon={Wrench}
          label="Maintenance"
          value={maintenance?.active ? "Active" : "None"}
          foot={maintenance?.active ? maintenance.reason || "in progress" : "everything running normally"}
          tone={maintenance?.active ? "text-warn" : undefined}
        />
      </div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight">API</h2>
            <p className="mt-1 max-w-xl text-base text-muted-foreground">
              The same JSON API this page reads. The public endpoints need no key; everything under
              /v1/me expects the Supabase session token.
            </p>
          </div>
          <a
            href="/docs#api-reference"
            className="text-sm font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-brand"
          >
            Read the API documentation
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { method: "GET", path: "/v1/status", note: "live values on this page" },
            { method: "GET", path: "/v1/servers", note: "public server list" },
            { method: "GET", path: "/v1/extensions", note: "published catalog" },
            { method: "GET", path: "/v1/invite/{token}", note: "the server behind an invite" },
          ].map((endpoint) => (
            <Card key={endpoint.path} className="gap-0 p-4 shadow-none">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px]">{endpoint.method}</span>
                <span className="truncate font-mono text-[13px] text-foreground">{endpoint.path}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{endpoint.note}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Community servers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Public servers on the network. The list comes from the public server endpoint.
            </p>
          </div>
        </div>

        {communityError ? (
          <ErrorState
            compact
            className="mt-4"
            title="Could not load community servers"
            detail={communityError}
            onRetry={() => setRetryNonce((n) => n + 1)}
          />
        ) : communityLoading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading the public servers…
          </p>
        ) : community.length === 0 ? (
          <p className="mt-4 rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
            No public servers right now.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {community.map((item, index) => {
              const motd = stripColors(item.motd);
              const favicon = safeMinecraftFavicon(item.live?.favicon);
              return (
                <Reveal key={item.host} delay={Math.min(index * 40, 240)} className="h-full">
                <Card className="h-full gap-0 p-4 shadow-none">
                  <div className="flex items-start gap-3">
                    {favicon ? (
                      <img src={favicon} alt="" className="size-10 shrink-0 rounded-md border" />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                        <Server className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item.domain ? `${item.host}.${item.domain}` : item.host}
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className={cn("font-normal", statusTone(item.status))}>
                          {item.status || "OFFLINE"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-8 text-sm text-muted-foreground">
                    {motd || <span className="italic">No message set.</span>}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {item.players_online ?? 0} / {item.players_max ?? 0} players
                    </span>
                    {item.live?.latency_ms != null ? <span>{item.live.latency_ms} ms</span> : null}
                    {item.version ? <span>{item.version}</span> : null}
                    {item.gamemode ? <span>{item.gamemode}</span> : null}
                    {item.owner?.mc_username ? <span>by {item.owner.mc_username}</span> : null}
                  </div>
                </Card>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
