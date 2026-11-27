import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { OverloadDialog } from "@/components/overload-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { publicApi, setRateLimitHandler } from "@/lib/api";
import { copyText, formatDate } from "@/lib/format";

interface InviteData {
  ok: boolean;
  server: {
    host: string;
    motd?: string;
    status?: string;
    version?: string;
    players_online?: number;
    players_max?: number;
  };
  join: { java?: string; bedrock?: { port?: number | string } };
  invite: {
    note?: string;
    uses?: number;
    max_uses?: number;
    expires_at?: string;
    can_control?: boolean;
  };
  live?: { players: number; max: number } | null;
}

function CopyButton({ value }: { value: string }) {
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
      className="koda-btn-pill h-7 px-3 text-[11px] whitespace-nowrap"
    >
      {copied ? (
        <Check className="size-3 text-emerald-400" />
      ) : (
        <Copy className="size-3 text-zinc-400" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function statusText(data: InviteData): string {
  if (data.server.status === "ONLINE") return data.server.version ? `Online · ${data.server.version}` : "Online";
  if (data.server.status === "HIBERNATED") return "Hibernated";
  return "Offline";
}

function statusTextColor(data: InviteData): string {
  if (data.server.status === "ONLINE") return "text-emerald-400";
  if (data.server.status === "HIBERNATED") return "text-amber-400";
  return "text-zinc-400";
}

export function InvitePage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const [overload, setOverload] = useState({ open: false, seconds: 30, nonce: 0 });

  useEffect(() => {
    setRateLimitHandler((seconds) =>
      setOverload((current) => ({ open: true, seconds, nonce: current.nonce + 1 })),
    );
    return () => setRateLimitHandler(null);
  }, []);

  useEffect(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const value =
      segments[0] === "invite" && segments[1]
        ? segments[1]
        : new URLSearchParams(window.location.search).get("t") || "";
    const normalized = value.trim().toLowerCase();
    setToken(normalized);

    if (!/^[a-f0-9]{18}$/.test(normalized)) {
      setError("The invite link is expired, revoked, or malformed.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    publicApi<InviteData>(`/v1/invite/${encodeURIComponent(normalized)}`)
      .then((result) => {
        if (cancelled) return;
        if (!result?.ok) {
          setError("This invite is no longer valid.");
          return;
        }
        setData(result);
        const name = result.server.motd?.trim() || result.server.host;
        document.title = `KodaHosting | ${name}`;
      })
      .catch((err: Error) => {
        if (!cancelled) {
          const message =
            err.message === "invite_invalid" || err.message === "not_found"
              ? "The link is expired, revoked, or already used up."
              : err.message || "Could not reach the KodaHosting network.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  const title = data ? (data.server.motd?.trim() || data.server.host) : "Server invite";
  const players =
    data && data.live && typeof data.live.players === "number"
      ? data.live.players
      : data?.server.players_online || 0;
  const maxPlayers =
    data && data.live && typeof data.live.max === "number"
      ? data.live.max
      : data?.server.players_max || 0;

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="resend-dot-grid pointer-events-none absolute inset-x-0 top-0 h-[380px] opacity-55"
        />

        <div className="relative mx-auto w-full max-w-4xl px-4 pt-28 pb-16 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin text-brand-ink" /> Loading invite details…
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl py-10">
              <ErrorState
                code="INVITE INVALID"
                title="This invite link is not valid"
                description="Ask the server owner to generate a fresh invite link inside KodaHosting. Invites expire automatically and can be revoked at any time."
                detail={error}
                onRetry={/^[a-f0-9]{18}$/.test(token) ? () => setRetryNonce((n) => n + 1) : undefined}
                secondaryAction={
                  <a href="/" className="koda-btn-pill h-9 px-4 text-xs">
                    <ArrowLeft className="size-3.5" />
                    Back to KodaHosting
                  </a>
                }
              />
            </div>
          ) : data ? (
            <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
              <div>
                <p className="font-mono text-xs text-zinc-500">
                  {data.server.host} · Hosted on Android with KodaHosting
                </p>
                <h1 className="resend-title mt-2.5 font-display text-3xl font-medium tracking-[-0.035em] break-words sm:text-4xl lg:text-5xl">
                  {title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs tabular">
                  <span className={statusTextColor(data)}>{statusText(data)}</span>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-zinc-400">
                    {players} / {maxPlayers} players
                  </span>
                </div>

                {data.invite.note ? (
                  <blockquote className="mt-6 rounded-2xl bg-[#09090b] px-4 py-3.5 text-sm leading-6 text-zinc-200">
                    “{data.invite.note}”
                  </blockquote>
                ) : null}

                <p className="mt-5 text-sm leading-6 text-zinc-400">
                  In Minecraft: <strong className="font-medium text-white">Play → Multiplayer → Add Server</strong>,
                  paste the address and join. Bedrock players use the address and the port in the
                  Servers tab.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-zinc-500 tabular">
                  {typeof data.invite.uses === "number" ? (
                    <span>
                      Opened {data.invite.uses}
                      {typeof data.invite.max_uses === "number" && data.invite.max_uses > 0
                        ? ` of ${data.invite.max_uses}`
                        : ""}{" "}
                      times
                    </span>
                  ) : null}
                  <span>
                    {data.invite.expires_at
                      ? `Expires ${formatDate(data.invite.expires_at)}`
                      : "No expiry"}
                  </span>
                </div>

                {data.invite.can_control ? (
                  <div className="mt-7">
                    <a
                      href={`/dashboard?invite=${encodeURIComponent(token)}`}
                      className="koda-btn-black h-10 px-5 text-sm"
                    >
                      Add to my dashboard
                    </a>
                    <p className="mt-2.5 max-w-md text-xs leading-5 text-zinc-500">
                      This invite carries control rights: the server appears in your dashboard under
                      Servers, with Start, Stop and Restart. You will be asked to sign in first — and
                      you can create a control account right there. It exists only to control shared
                      servers and becomes a full account automatically later.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="resend-glass-panel overflow-hidden rounded-3xl">
                <div className="border-b border-white/[0.06] px-5 py-3.5 font-mono text-[11px] tracking-[0.06em] text-zinc-500 uppercase">
                  Connection details
                </div>
                <div className="divide-y divide-white/[0.06]">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm text-zinc-400">Java address</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono text-[13px] text-white tabular">
                        {data.join.java || "-"}
                      </span>
                      {data.join.java ? <CopyButton value={data.join.java} /> : null}
                    </div>
                  </div>
                  {data.join.bedrock?.port ? (
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <span className="text-sm text-zinc-400">Bedrock port</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono text-[13px] text-white tabular">
                          {String(data.join.bedrock.port)}
                        </span>
                        <CopyButton value={String(data.join.bedrock.port)} />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm text-zinc-400">Players</span>
                    <span className="font-mono text-sm text-white tabular">
                      {players} / {maxPlayers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm text-zinc-400">Status</span>
                    <span className="text-sm text-zinc-200">{statusText(data)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
      <OverloadDialog
        open={overload.open}
        seconds={overload.seconds}
        nonce={overload.nonce}
        onDismiss={() => setOverload((current) => ({ ...current, open: false }))}
      />
    </div>
  );
}
