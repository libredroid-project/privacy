import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Server } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { publicApi } from "@/lib/api";
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
    <Button type="button" variant="outline" size="sm" onClick={copy} aria-label={`Copy ${value}`}>
      {copied ? <Check className="size-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function statusText(data: InviteData): string {
  if (data.server.status === "ONLINE") return data.server.version ? `Online · ${data.server.version}` : "Online";
  if (data.server.status === "HIBERNATED") return "Hibernated";
  return "Offline";
}

function statusTone(data: InviteData): string {
  if (data.server.status === "ONLINE") return "tone-online";
  if (data.server.status === "HIBERNATED") return "tone-pending";
  return "border-border bg-muted text-muted-foreground";
}

export function InvitePage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const value =
      segments[0] === "invite" && segments[1]
        ? segments[1]
        : new URLSearchParams(window.location.search).get("t") || "";
    const normalized = value.trim().toLowerCase();
    setToken(normalized);

    if (!/^[a-f0-9]{18}$/.test(normalized)) {
      setError("This invite is not valid. The link is expired, revoked or already used up.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    publicApi<InviteData>(`/v1/invite/${encodeURIComponent(normalized)}`)
      .then((result) => {
        if (cancelled) return;
        if (!result?.ok) {
          setError("This invite is not valid any more.");
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
              ? "The link is expired, revoked or already used up."
              : err.message || "Could not reach the network.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 pt-28 pb-14 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading the invite…
            </div>
          ) : error ? (
            <div className="mx-auto flex max-w-xl flex-col justify-center py-16">
              <Alert variant="destructive">
                <AlertTitle>This invite is not valid</AlertTitle>
                <AlertDescription>
                  {error} Ask the server owner for a new link.
                </AlertDescription>
              </Alert>
              <div className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Server className="mx-auto mb-3 size-6" />
                An invite links you to a server hosted on someone's phone. It expires on its own and
                can be revoked at any time.
              </div>
            </div>
          ) : data ? (
            <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
              <div>
                <h1 className="text-3xl font-medium tracking-[-0.035em] break-words sm:text-4xl lg:text-5xl">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.server.host} · hosted on a phone with KodaHosting
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="outline" className={`gap-1.5 font-normal ${statusTone(data)}`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {statusText(data)}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {players} / {maxPlayers} players
                  </Badge>
                </div>

                {data.invite.note ? (
                  <blockquote className="mt-5 border-l-2 border-brand bg-brand-soft/50 px-4 py-3 text-sm text-foreground">
                    “{data.invite.note}”
                  </blockquote>
                ) : null}

                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  In Minecraft: <strong className="text-foreground">Play → Multiplayer → Add Server</strong>,
                  paste the address and join. Bedrock players use the address and the port in the
                  Servers tab.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {typeof data.invite.uses === "number" ? (
                    <span>
                      opened {data.invite.uses}
                      {typeof data.invite.max_uses === "number" && data.invite.max_uses > 0
                        ? ` of ${data.invite.max_uses}`
                        : ""}{" "}
                      times
                    </span>
                  ) : null}
                  <span>
                    {data.invite.expires_at
                      ? `expires ${formatDate(data.invite.expires_at)}`
                      : "no expiry"}
                  </span>
                </div>

                {data.invite.can_control ? (
                  <div className="mt-7">
                    <Button asChild>
                      <a href={`/dashboard?invite=${encodeURIComponent(token)}`}>Add to my dashboard</a>
                    </Button>
                    <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
                      This invite carries control rights: the server appears in your dashboard under
                      Servers, with Start, Stop and Restart. You will be asked to sign in first.
                    </p>
                  </div>
                ) : null}
              </div>

              <Card className="gap-0 overflow-hidden py-0 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                <div className="border-b px-5 py-3.5 text-sm font-medium">Connection details</div>
                <div className="divide-y">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm text-muted-foreground">Java address</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono text-[13px]">{data.join.java || "—"}</span>
                      {data.join.java ? <CopyButton value={data.join.java} /> : null}
                    </div>
                  </div>
                  {data.join.bedrock?.port ? (
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <span className="text-sm text-muted-foreground">Bedrock port</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono text-[13px]">{String(data.join.bedrock.port)}</span>
                        <CopyButton value={String(data.join.bedrock.port)} />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm text-muted-foreground">Players</span>
                    <span className="text-sm">
                      {players} / {maxPlayers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="text-sm">{statusText(data)}</span>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
