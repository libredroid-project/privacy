import { useEffect, useState } from "react";
import { Activity, Boxes, Loader2, Server, ShieldCheck, Wrench } from "lucide-react";
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

function communityStatusTone(status?: string): { dot: string; text: string } {
  if (status === "ONLINE") return { dot: "bg-emerald-400", text: "text-emerald-400" };
  if (status === "HIBERNATED") return { dot: "bg-amber-400", text: "text-amber-300" };
  return { dot: "bg-zinc-600", text: "text-zinc-500" };
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
    <div className="resend-glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] tracking-[0.06em] text-zinc-500 uppercase">{label}</span>
        <Icon className="size-4 text-zinc-500" />
      </div>
      <div className={cn("mt-3 font-display text-2xl font-medium tracking-[-0.02em] tabular-nums text-white", tone)}>
        {value}
      </div>
      <div className="mt-1.5 text-xs text-zinc-400">{foot}</div>
    </div>
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
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">Status</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
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
      <div className="resend-glass-panel flex items-center justify-center gap-2 rounded-2xl p-12 text-sm text-zinc-400">
        <Loader2 className="size-4 animate-spin" /> Loading live telemetry...
      </div>
    );
  }

  const vps = status.vps;
  const release = status.release;
  const maintenance = status.maintenance;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">Status</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Live values from api.kodanetwork.eu and the tunnel server.
        </p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Activity}
          label="API"
          value={status.ok ? "Online" : "Down"}
          foot={`api.kodanetwork.eu · v${status.api?.version ?? "-"}`}
          tone={status.ok ? "text-emerald-400" : "text-red-400"}
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
          tone={vps && !vps.stale ? "text-emerald-400" : undefined}
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
          foot={maintenance?.active ? maintenance.reason || "in progress" : "Everything running normally"}
          tone={maintenance?.active ? "text-amber-300" : undefined}
        />
      </div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-white">Public API</h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              The same JSON API this page reads. Public endpoints need no key; anything under /v1/me expects a Supabase session token.
            </p>
          </div>
          <a
            href="/docs#api-reference"
            className="text-xs font-medium text-zinc-300 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-brand"
          >
            Read the API documentation
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { method: "GET", path: "/v1/status", note: "Live values on this page" },
            { method: "GET", path: "/v1/servers", note: "Public server list" },
            { method: "GET", path: "/v1/extensions", note: "Published catalog" },
            { method: "GET", path: "/v1/invite/{token}", note: "Server behind an invite" },
          ].map((endpoint) => (
            <div key={endpoint.path} className="resend-glass-panel rounded-2xl p-4">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-brand-ink">{endpoint.method}</span>
                <span className="truncate text-white">{endpoint.path}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">{endpoint.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div>
          <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-white">
            Community servers
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Public servers on the network, read live from the public server endpoint.
          </p>
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
          <div className="resend-glass-panel mt-4 flex items-center justify-center gap-2 rounded-2xl p-10 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin" /> Loading public servers...
          </div>
        ) : community.length === 0 ? (
          <div className="resend-glass-panel mt-4 rounded-2xl p-10 text-center text-sm text-zinc-400">
            No public servers online right now.
          </div>
        ) : (
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {community.map((item, index) => {
              const motd = stripColors(item.motd);
              const favicon = safeMinecraftFavicon(item.live?.favicon);
              const tone = communityStatusTone(item.status);
              return (
                <Reveal key={item.host} delay={Math.min(index * 40, 240)} className="h-full">
                  <div className="resend-glass-panel flex h-full flex-col rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      {favicon ? (
                        <img
                          src={favicon}
                          alt=""
                          className="size-10 shrink-0 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08]"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
                          <Server className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs font-medium text-white">
                          {item.domain ? `${item.host}.${item.domain}` : item.host}
                        </div>
                        <div className="mt-1">
                          <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px]", tone.text)}>
                            <span className={cn("size-1.5 rounded-full", tone.dot)} />
                            {item.status || "OFFLINE"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-5 text-zinc-400">
                      {motd || <span className="italic text-zinc-500">No MOTD set.</span>}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/[0.06] pt-3 font-mono text-[11px] tabular-nums text-zinc-500">
                      <span className="text-zinc-300">
                        {item.players_online ?? 0}/{item.players_max ?? 0} players
                      </span>
                      {item.live?.latency_ms != null ? <span>· {item.live.latency_ms} ms</span> : null}
                      {item.version ? <span>· {item.version}</span> : null}
                      {item.gamemode ? <span>· {item.gamemode}</span> : null}
                      {item.owner?.mc_username ? <span>· {item.owner.mc_username}</span> : null}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
