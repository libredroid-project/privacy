import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  Terminal,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { AnimatedSwitch, AnimatedToggle } from "@/components/animated-switch";
import { ErrorState } from "@/components/error-state";
import { OverloadDialog } from "@/components/overload-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { setRateLimitHandler } from "@/lib/api";
import { copyText } from "@/lib/format";
import {
  buildMcpClientConfig,
  classifyMcpPermissions,
  hasKodaDash,
  MCP_CLIENTS,
  mcpEndpointUrl,
  mcpServerSlug,
  type DetectedMcpPermissions,
  type McpClientId,
} from "@/lib/mcp-config";
import { getStatusDetails, isDatabase, versionLabel, type ServerRow } from "@/lib/server-status";
import { supabase } from "@/lib/supabase";
import { LoginDialog } from "@/store/login-dialog";
import { useSession } from "@/store/use-session";
import { cn } from "@/lib/utils";

type ProbeState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; permissions: DetectedMcpPermissions; checkedAt: string }
  | { status: "auth_error"; message: string }
  | { status: "disabled"; message: string }
  | { status: "unreachable"; message: string };

const PERMISSION_ROWS: {
  key: keyof Pick<
    DetectedMcpPermissions,
    "read" | "console" | "filesWrite" | "serverSettings" | "plugins" | "modrinth"
  >;
  label: string;
  description: string;
}[] = [
  {
    key: "read",
    label: "Read & telemetry",
    description: "Status, console tail, players, files, logs, plugins, and properties.",
  },
  {
    key: "console",
    label: "Console commands",
    description: "Dispatch non-lifecycle server commands over the live console.",
  },
  {
    key: "filesWrite",
    label: "File edits & writes",
    description: "Write, rename, or remove server configuration and world files.",
  },
  {
    key: "serverSettings",
    label: "Server settings",
    description: "Validated edits to MOTD, max players, and server.properties.",
  },
  {
    key: "plugins",
    label: "Plugin management",
    description: "Enable, disable, or manage installed Paper/Purpur plugins.",
  },
  {
    key: "modrinth",
    label: "Modrinth SHA-512 install",
    description: "Download and verify plugins from Modrinth by SHA-512 hash.",
  },
];

function AppSetupSteps() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-[#09090b] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="font-mono text-[11px] text-brand-ink">Step 1 · Android app</div>
        <h3 className="mt-1.5 font-display text-sm font-medium text-white">
          Enable KodaDash MCP
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-zinc-400">
          Open your Paper or Purpur server in the KodaHosting app, go to{" "}
          <span className="font-mono text-zinc-200">KodaDash &rarr; AI access (MCP)</span>, and turn
          on MCP under Connection.
        </p>
      </div>
      <div className="rounded-2xl bg-[#09090b] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="font-mono text-[11px] text-brand-ink">Step 2 · Permissions</div>
        <h3 className="mt-1.5 font-display text-sm font-medium text-white">
          Set scopes on your phone
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-zinc-400">
          Pick Read-only mode or individual capability toggles in the app. Permissions live on your
          device and cannot be changed from this website.
        </p>
      </div>
      <div className="rounded-2xl bg-[#09090b] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="font-mono text-[11px] text-brand-ink">Step 3 · Copy config</div>
        <h3 className="mt-1.5 font-display text-sm font-medium text-white">
          Paste token &amp; copy JSON
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-zinc-400">
          Copy the MCP token from the app, verify which permissions are active, and copy the
          pre-filled config for your AI client.
        </p>
      </div>
    </div>
  );
}

export function McpPage() {
  const { session, ready, signOut } = useSession();
  const userId = session?.user.id || "";
  const requestedHost = useMemo(
    () => (new URLSearchParams(window.location.search).get("server") || "").trim().toLowerCase(),
    [],
  );

  const [loginOpen, setLoginOpen] = useState(false);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashHttps, setDashHttps] = useState(true);

  const [selectedHost, setSelectedHost] = useState<string>("");
  const [client, setClient] = useState<McpClientId>("claude-code");
  const [mcpToken, setMcpToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [useEnvVar, setUseEnvVar] = useState(false);
  const [probe, setProbe] = useState<ProbeState>({ status: "idle" });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [overload, setOverload] = useState({ open: false, seconds: 30, nonce: 0 });

  useEffect(() => {
    setRateLimitHandler((seconds) =>
      setOverload((current) => ({ open: true, seconds, nonce: current.nonce + 1 })),
    );
    return () => setRateLimitHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "kodadash_https")
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const value = data?.[0]?.value as { enabled?: boolean } | undefined;
        if (value && typeof value.enabled === "boolean") {
          setDashHttps(value.enabled);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchServers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("rpc_get_servers_for_auth");
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    const rows = (data || []) as ServerRow[];
    setServers(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setServers([]);
      setSelectedHost("");
      setProbe({ status: "idle" });
      return;
    }
    void fetchServers();
  }, [userId, fetchServers]);

  const mcpServers = useMemo(() => servers.filter(hasKodaDash), [servers]);
  const mcServers = useMemo(() => servers.filter((row) => !isDatabase(row)), [servers]);

  useEffect(() => {
    if (mcpServers.length === 0) {
      setSelectedHost("");
      return;
    }
    setSelectedHost((current) => {
      if (current && mcpServers.some((row) => row.host === current)) return current;
      const fromQuery = requestedHost
        ? mcpServers.find((row) => row.host.toLowerCase() === requestedHost)
        : undefined;
      return fromQuery?.host || mcpServers[0].host;
    });
  }, [mcpServers, requestedHost]);

  const selectedServer = useMemo(
    () => mcpServers.find((row) => row.host === selectedHost) || null,
    [mcpServers, selectedHost],
  );

  // Reset probe when switching servers
  useEffect(() => {
    setProbe({ status: "idle" });
  }, [selectedHost]);

  const endpointUrl = selectedServer ? mcpEndpointUrl(selectedServer, dashHttps) : "";
  const serverSlug = selectedServer ? mcpServerSlug(selectedServer.host) : "kodahosting-server";
  const clientMeta = MCP_CLIENTS.find((c) => c.id === client) || MCP_CLIENTS[0];

  const configText = useMemo(() => {
    if (!selectedServer) return "";
    return buildMcpClientConfig({
      client,
      serverSlug,
      endpointUrl,
      token: mcpToken,
      useEnvVar,
    });
  }, [selectedServer, client, serverSlug, endpointUrl, mcpToken, useEnvVar]);

  const curlCheck = useMemo(() => {
    if (!endpointUrl) return "";
    const tok = mcpToken.trim() || "<paste-mcp-token-from-app>";
    return [
      `curl -sS -X POST "${endpointUrl}" \\`,
      `  -H "Authorization: Bearer ${tok}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
    ].join("\n");
  }, [endpointUrl, mcpToken]);

  async function checkLivePermissions() {
    if (!endpointUrl) return;
    const tok = mcpToken.trim();
    if (!tok) {
      toast.error("Paste the MCP token from the KodaHosting app first.");
      return;
    }
    setProbe({ status: "checking" });
    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tok}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
      });

      if (response.status === 401 || response.status === 403) {
        setProbe({
          status: "auth_error",
          message:
            "The server rejected this token (HTTP 401). Make sure you copied the dedicated MCP token from KodaDash -> AI access (MCP) and not the KodaDash web login token.",
        });
        return;
      }

      if (response.status === 404) {
        setProbe({
          status: "disabled",
          message:
            "MCP is currently turned off on this server (HTTP 404). Open KodaDash -> AI access (MCP) in the KodaHosting app and enable it first.",
        });
        return;
      }

      if (!response.ok) {
        setProbe({
          status: "unreachable",
          message: `The server responded with HTTP ${response.status}. Confirm the server is online and running KodaDash 1.1.0+.`,
        });
        return;
      }

      const payload = (await response.json()) as {
        result?: { tools?: { name?: string }[] };
        error?: { message?: string };
      };

      if (payload.error) {
        setProbe({
          status: "unreachable",
          message: payload.error.message || "The MCP endpoint returned a JSON-RPC error.",
        });
        return;
      }

      const tools = (payload.result?.tools || [])
        .map((t) => (typeof t?.name === "string" ? t.name : ""))
        .filter(Boolean);

      setProbe({
        status: "ok",
        permissions: classifyMcpPermissions(tools),
        checkedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      toast.success(`Verified ${tools.length} live MCP tools.`);
    } catch {
      setProbe({
        status: "unreachable",
        message:
          "Browser could not reach the MCP endpoint directly. Either the server is currently offline or its proxy does not allow cross-origin browser probes. You can still copy the config below or run the curl command from your terminal.",
      });
    }
  }

  async function handleCopy(key: string, value: string, label: string) {
    if (!(await copyText(value))) {
      toast.error("Could not write to clipboard.");
      return;
    }
    setCopiedKey(key);
    toast.success(`${label} copied.`);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader
        auth={{
          signedIn: Boolean(session),
          onSignIn: () => setLoginOpen(true),
          onSignOut: () => {
            void signOut();
            toast.success("Signed out.");
          },
        }}
      />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pt-28 pb-20 sm:px-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-6 pb-10 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="font-mono text-xs text-brand-ink">KodaDash Model Context Protocol</p>
              <h1 className="resend-title mt-2 font-display text-3xl font-medium tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                KodaDash MCP setup
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-zinc-400">
                Connect Claude Code, Cursor, Antigravity, VS Code, Windsurf, Codex, ZCode, or Claude
                Desktop directly to your Minecraft server. Enable MCP and configure permissions in
                the KodaHosting Android app first, then inspect active scopes and copy your client
                config below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a
                href="/docs#koda-dash-mcp"
                className="koda-btn-pill h-9 px-3.5 text-xs whitespace-nowrap shrink-0"
              >
                MCP documentation
                <ArrowUpRight className="size-3.5 opacity-70" />
              </a>
              {session ? (
                <button
                  type="button"
                  onClick={() => void fetchServers()}
                  disabled={loading}
                  className="koda-btn-pill h-9 px-3.5 text-xs whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                  Refresh servers
                </button>
              ) : null}
            </div>
          </div>

          {/* Auth gate */}
          {!ready ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin" /> Checking your session…
            </div>
          ) : !session ? (
            <div className="space-y-8">
              <div className="resend-glass-panel rounded-3xl p-6 sm:p-9">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 font-mono text-xs text-brand-ink">
                      <Terminal className="size-3.5" />
                      Sign in to check your servers
                    </div>
                    <h2 className="mt-2 font-display text-2xl font-medium tracking-[-0.025em] text-white">
                      Detect KodaDash servers automatically.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Sign in with your KodaHosting account so we can list your servers with
                      KodaDash enabled, pre-fill their{" "}
                      <span className="font-mono text-zinc-200">/mcp</span> endpoints, and inspect
                      which permissions you configured in the Android app.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLoginOpen(true)}
                      className="koda-btn-black h-10 px-5 text-sm whitespace-nowrap shrink-0"
                    >
                      Sign in to continue
                    </button>
                    <a
                      href="/dashboard"
                      className="koda-btn-pill h-10 px-4 text-sm whitespace-nowrap shrink-0"
                    >
                      Open Dashboard
                    </a>
                  </div>
                </div>
              </div>

              <AppSetupSteps />
            </div>
          ) : error ? (
            <ErrorState
              code="SERVER SYNC ERROR"
              title="Could not check your servers"
              description="We could not reach KodaHosting to check which servers have KodaDash MCP enabled."
              detail={error}
              onRetry={() => void fetchServers()}
            />
          ) : loading && servers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin" /> Checking your servers for KodaDash MCP…
            </div>
          ) : mcpServers.length === 0 ? (
            <div className="space-y-8">
              <div className="resend-glass-panel rounded-3xl p-6 sm:p-9">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-ink">
                    <Smartphone className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-brand-ink">APP SETUP REQUIRED FIRST</p>
                    <h2 className="mt-1 font-display text-2xl font-medium tracking-[-0.025em] text-white">
                      No server with KodaDash MCP found yet
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                      {mcServers.length > 0
                        ? `We found ${mcServers.length} Minecraft ${mcServers.length === 1 ? "server" : "servers"} on your account, but none have KodaDash enabled yet. KodaDash MCP requires a Paper or Purpur server with KodaDash turned on inside the Android app.`
                        : "You do not have a Minecraft server with KodaDash enabled on this account yet. Create a Paper or Purpur server in the KodaHosting Android app and turn on KodaDash + AI access (MCP)."}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => void fetchServers()}
                        className="koda-btn-black h-9 px-4 text-xs whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="size-3.5 text-brand-ink" />
                        Check again
                      </button>
                      <a
                        href="/dashboard"
                        className="koda-btn-pill h-9 px-4 text-xs whitespace-nowrap shrink-0"
                      >
                        View servers in Dashboard
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <AppSetupSteps />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Step 1: Server selection */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] text-brand-ink uppercase">
                      1 · Choose a server
                    </p>
                    <h2 className="mt-0.5 font-display text-lg font-medium text-white">
                      KodaDash-enabled servers ({mcpServers.length})
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-zinc-500">
                    Endpoint URL and server name are pre-filled automatically
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mcpServers.map((row) => {
                    const active = row.host === selectedHost;
                    const status = getStatusDetails(row.server_version);
                    const url = mcpEndpointUrl(row, dashHttps);
                    return (
                      <button
                        key={row.id || row.host}
                        type="button"
                        onClick={() => setSelectedHost(row.host)}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-col justify-between rounded-2xl p-4 text-left transition-colors duration-150",
                          active
                            ? "bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                            : "bg-[#09090b] hover:bg-white/[0.04]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                active
                                  ? "bg-brand/15 text-brand-ink"
                                  : "bg-white/[0.05] text-zinc-400",
                              )}
                            >
                              <Server className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-display text-sm font-medium text-white">
                                {row.host}
                              </div>
                              <div className="truncate font-mono text-[11px] text-zinc-500">
                                {versionLabel(row.server_version)}
                              </div>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px]",
                              status.tone === "online"
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-white/[0.05] text-zinc-400",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                status.tone === "online" ? "bg-emerald-400" : "bg-zinc-500",
                              )}
                            />
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-3 truncate font-mono text-[11px] text-zinc-400">
                          {url}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 2: App permissions (read-only) & MCP token */}
              {selectedServer ? (
                <section className="resend-glass-panel rounded-3xl p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] pb-6 md:flex-row md:items-start">
                    <div className="max-w-2xl">
                      <p className="font-mono text-[11px] text-brand-ink uppercase">
                        2 · App credentials &amp; active permissions
                      </p>
                      <h2 className="mt-1 font-display text-xl font-medium tracking-[-0.02em] text-white">
                        Configured in the Android app (read-only view)
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                        Permissions and token rotation are managed exclusively on your phone under{" "}
                        <span className="font-mono text-xs text-zinc-200">
                          Server &rarr; KodaDash &rarr; AI access (MCP)
                        </span>
                        . Paste your MCP token below to fill it into your client config and inspect
                        which permissions are enabled right now. Your token stays in this browser
                        tab and is never stored on KodaHosting servers.
                      </p>
                    </div>
                  </div>

                  {/* Pre-filled endpoint + MCP token input */}
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block font-mono text-[11px] text-zinc-500 uppercase">
                        MCP Endpoint URL (auto-filled)
                      </label>
                      <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-black/80 px-3.5 py-2.5 ring-1 ring-white/[0.08]">
                        <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">
                          {endpointUrl}
                        </code>
                        <button
                          type="button"
                          onClick={() => void handleCopy("endpoint", endpointUrl, "Endpoint URL")}
                          className="shrink-0 text-zinc-400 transition-colors hover:text-white"
                          aria-label="Copy MCP endpoint URL"
                        >
                          {copiedKey === "endpoint" ? (
                            <Check className="size-3.5 text-brand-ink" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="koda-mcp-token"
                        className="block font-mono text-[11px] text-zinc-500 uppercase"
                      >
                        MCP Token from KodaHosting app
                      </label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="relative flex-1">
                          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-500" />
                          <Input
                            id="koda-mcp-token"
                            type={showToken ? "text" : "password"}
                            value={mcpToken}
                            onChange={(e) => setMcpToken(e.target.value)}
                            placeholder="Paste MCP token from Connection sheet"
                            autoComplete="off"
                            spellCheck={false}
                            className="h-10 rounded-xl border-0 bg-black/80 pr-9 pl-9 font-mono text-xs text-white ring-1 ring-white/[0.08] placeholder:text-zinc-600 focus-visible:ring-white/25"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            aria-label={showToken ? "Hide MCP token" : "Show MCP token"}
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-200"
                          >
                            {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => void checkLivePermissions()}
                          disabled={probe.status === "checking"}
                          className="koda-btn-black h-10 px-4 text-xs whitespace-nowrap shrink-0 disabled:opacity-50"
                        >
                          {probe.status === "checking" ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin text-brand-ink" />
                              Checking…
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="size-3.5 text-brand-ink" />
                              Inspect permissions
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live inspection feedback */}
                  {probe.status === "auth_error" || probe.status === "disabled" ? (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#12090a] p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.22)]">
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                      <p className="text-xs leading-5 text-zinc-300">{probe.message}</p>
                    </div>
                  ) : probe.status === "unreachable" ? (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                      <p className="text-xs leading-5 text-zinc-400">{probe.message}</p>
                    </div>
                  ) : probe.status === "ok" ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-500/[0.07] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>
                          Live permissions verified at {probe.checkedAt} ·{" "}
                          <strong className="font-medium text-white">
                            {probe.permissions.toolNames.length} tools exposed
                          </strong>
                          {probe.permissions.readOnly ? " · Read-only mode active" : ""}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-300/80">
                        Synced from {selectedServer.host}
                      </span>
                    </div>
                  ) : null}

                  {/* Read-only permission matrix */}
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {PERMISSION_ROWS.map((item) => {
                      const verified = probe.status === "ok";
                      const enabled = verified ? probe.permissions[item.key] : null;
                      return (
                        <div
                          key={item.key}
                          className="flex items-start justify-between gap-3 rounded-2xl bg-black/75 p-4"
                        >
                          <div className="min-w-0">
                            <div className="font-display text-sm font-medium text-zinc-100">
                              {item.label}
                            </div>
                            <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase",
                              enabled === true
                                ? "bg-emerald-400/10 text-emerald-300"
                                : enabled === false
                                  ? "bg-white/[0.04] text-zinc-500"
                                  : "bg-white/[0.04] text-zinc-500",
                            )}
                          >
                            {enabled === true ? "Allowed" : enabled === false ? "Off" : "App-set"}
                          </span>
                        </div>
                      );
                    })}

                    {/* Permanent power lock */}
                    <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/[0.025] p-4 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="mt-0.5 size-4 shrink-0 text-brand-ink" />
                        <div>
                          <div className="font-display text-sm font-medium text-zinc-200">
                            Start / Stop / Restart / Hibernate
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                            Server power lifecycle is permanently hard-blocked from every AI client
                            regardless of app permissions.
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-brand/10 px-2 py-0.5 font-mono text-[10.5px] font-medium text-brand-ink uppercase">
                        Locked
                      </span>
                    </div>
                  </div>
                </section>
              ) : null}

              {/* Step 3: Ready-to-copy client config */}
              {selectedServer ? (
                <section className="resend-glass-panel overflow-hidden rounded-3xl">
                  <div className="flex flex-col gap-4 border-b border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="font-mono text-[11px] text-brand-ink uppercase">
                          3 · Copy client configuration
                        </p>
                        <h2 className="mt-1 font-display text-xl font-medium tracking-[-0.02em] text-white">
                          Ready-to-paste {clientMeta.format.toUpperCase()} for {clientMeta.label}
                        </h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">Use env var for token</span>
                        <AnimatedToggle
                          checked={useEnvVar}
                          onChange={() => setUseEnvVar((v) => !v)}
                          ariaLabel="Use environment variable instead of literal MCP token"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-1">
                      <AnimatedSwitch<McpClientId>
                        role="tablist"
                        ariaLabel="Select MCP AI client"
                        size="sm"
                        value={client}
                        onChange={setClient}
                        options={MCP_CLIENTS.map((item) => ({
                          id: item.id,
                          label: item.label,
                        }))}
                      />
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-zinc-200">{clientMeta.fileHint}</div>
                        <p className="mt-0.5 text-xs text-zinc-500">{clientMeta.note}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(
                            "config",
                            configText,
                            `${clientMeta.label} ${clientMeta.format.toUpperCase()}`,
                          )
                        }
                        className="koda-btn-black h-9 px-4 text-xs whitespace-nowrap shrink-0"
                      >
                        {copiedKey === "config" ? (
                          <>
                            <Check className="size-3.5 text-brand-ink" />
                            Copied {clientMeta.format.toUpperCase()}
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5 text-brand-ink" />
                            Copy {clientMeta.format.toUpperCase()}
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/90 p-5 font-mono text-[12.5px] leading-6 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      {configText}
                    </pre>

                    {!useEnvVar && !mcpToken.trim() ? (
                      <p className="mt-3 text-xs text-zinc-500">
                        Tip: Paste your MCP token in Step 2 above to fill it into the{" "}
                        <code className="font-mono text-zinc-300">Authorization</code> header
                        automatically, or toggle env var mode to keep the token out of config files.
                      </p>
                    ) : null}

                    {/* Terminal quick check */}
                    <div className="mt-6 rounded-2xl bg-black/75 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-zinc-400">
                          Quick terminal check (JSON-RPC tools/list)
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleCopy("curl", curlCheck, "curl command")}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 transition-colors hover:text-white"
                        >
                          {copiedKey === "curl" ? (
                            <>
                              <Check className="size-3 text-brand-ink" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              Copy curl
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="mt-2 overflow-x-auto font-mono text-[11.5px] leading-5 text-zinc-400">
                        {curlCheck}
                      </pre>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <OverloadDialog
        open={overload.open}
        seconds={overload.seconds}
        nonce={overload.nonce}
        onDismiss={() => setOverload((current) => ({ ...current, open: false }))}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}
