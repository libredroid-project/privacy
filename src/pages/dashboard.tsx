import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/store/use-session";
import {
  Activity,
  ArrowUpRight,
  Database,
  FileText,
  Loader2,
  LogOut,
  MessagesSquare,
  Puzzle,
  Scale,
  Server,
  Terminal,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AnimatedSidebarNav, type AnimatedSidebarItem } from "@/components/animated-sidebar-nav";
import { OverloadDialog } from "@/components/overload-dialog";
import { SiteFooter } from "@/components/site-footer";
import { api, setRateLimitHandler } from "@/lib/api";
import { avatarInitial, avatarUrl, appStateDetails, kodadashUrl, type AppStateDetails, type Me, type ServerRow } from "@/lib/server-status";
import { supabase } from "@/lib/supabase";
import { AccountView } from "@/dashboard/account-view";
import { DatabasesView, ServersView, AppStatusCard } from "@/dashboard/servers-view";
import { ExtensionsView } from "@/dashboard/extensions-view";
import { LegalView } from "@/dashboard/legal-view";
import { LicensesView } from "@/dashboard/licenses-view";
import { LoginView } from "@/dashboard/login-view";
import { StatusView } from "@/dashboard/status-view";
import { TicketsView } from "@/dashboard/tickets-view";
import type { DeviceRow, ExtensionItem, MyExtensionItem } from "@/dashboard/types";

type TabId =
  | "servers"
  | "databases"
  | "tickets"
  | "extensions"
  | "account"
  | "status"
  | "licenses"
  | "legal";

type Feedback = { tone: "ok" | "err"; text: string };

const MANAGE: { id: TabId; label: string; icon: typeof Server }[] = [
  { id: "servers", label: "Servers", icon: Server },
  { id: "databases", label: "Databases", icon: Database },
  { id: "tickets", label: "Support Tickets", icon: MessagesSquare },
  { id: "extensions", label: "Extensions", icon: Puzzle },
  { id: "account", label: "Account", icon: UserRound },
];

const INFO: { id: TabId; label: string; icon: typeof Server }[] = [
  { id: "status", label: "Status", icon: Activity },
  { id: "licenses", label: "Licenses", icon: FileText },
  { id: "legal", label: "Legal", icon: Scale },
];

interface ShellProps {
  userId: string;
  signOut: () => Promise<unknown>;
  me: Me | null;
  devices: DeviceRow[];
  accountLoading: boolean;
  accountError: string;
  deviceError: string;
  loadAccount: () => Promise<void>;
  servers: ServerRow[];
  serversError: string;
  appStatus: AppStateDetails | null;
  busyHost: string | null;
  feedback: Record<string, Feedback>;
  sendCommand: (row: ServerRow, action: "start" | "restart" | "stop") => void;
  openKodaDash: (row: ServerRow) => void;
  fetchServers: () => Promise<void>;
  allExt: ExtensionItem[];
  mineExt: MyExtensionItem[];
  extLoading: boolean;
  extError: string;
  loadExtensions: () => Promise<void>;
}

function DashboardShell(props: ShellProps) {
  const { setOpenMobile } = useSidebar();
  const [tab, setTab] = useState<TabId>("servers");
  const [inviteBanner, setInviteBanner] = useState<Feedback | null>(null);
  const inviteHandled = useRef(false);
  const inviteToken = useMemo(
    () => (new URLSearchParams(window.location.search).get("invite") || "").trim().toLowerCase(),
    [],
  );

  function switchTab(next: TabId) {
    setTab(next);
    window.scrollTo({ top: 0 });
    setOpenMobile(false);
    if (next === "account") void props.loadAccount();
    if (next === "extensions") void props.loadExtensions();
  }

  useEffect(() => {
    if (!props.userId || inviteHandled.current) return;
    if (!/^[a-f0-9]{18}$/.test(inviteToken)) return;
    inviteHandled.current = true;
    api(`/v1/invite/${encodeURIComponent(inviteToken)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(() => {
        setInviteBanner({
          tone: "ok",
          text: "Invite accepted. The shared server is in your list below.",
        });
        switchTab("servers");
        void props.fetchServers();
      })
      .catch((err: Error) => {
        setInviteBanner({
          tone: "err",
          text: `The invite could not be used (${err.message}).`,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.userId, inviteToken]);

  function renderTab() {
    switch (tab) {
      case "servers":
        return (
          <ServersView
            rows={props.servers}
            error={props.serversError}
            busyHost={props.busyHost}
            feedback={props.feedback}
            inviteBanner={inviteBanner}
            onCommand={props.sendCommand}
            onOpenDash={props.openKodaDash}
            onRetry={() => void props.fetchServers()}
            onDismissInvite={() => setInviteBanner(null)}
          />
        );
      case "databases":
        return <DatabasesView rows={props.servers} />;
      case "tickets":
        return <TicketsView />;
      case "extensions":
        return (
          <ExtensionsView
            all={props.allExt}
            mine={props.mineExt}
            loading={props.extLoading}
            error={props.extError}
            onRetry={() => void props.loadExtensions()}
          />
        );
      case "account":
        return (
          <AccountView
            me={props.me}
            devices={props.devices}
            loading={props.accountLoading}
            error={props.accountError}
            deviceError={props.deviceError}
            onReload={props.loadAccount}
          />
        );
      case "status":
        return <StatusView />;
      case "licenses":
        return <LicensesView />;
      case "legal":
        return <LegalView />;
      default:
        return null;
    }
  }

  const manageItems: AnimatedSidebarItem[] = useMemo(() => {
    const isControl = props.me?.account_type === "control";
    // control accounts exist only to run servers shared by other people: servers
    // and account, nothing else. the mcp docs link is a normal-account extra too.
    const items: AnimatedSidebarItem[] = [];
    for (const item of MANAGE) {
      if (isControl && item.id !== "servers" && item.id !== "account") continue;
      items.push({
        id: item.id,
        label: item.label,
        icon: item.icon,
        onClick: () => switchTab(item.id),
      });
    }
    if (!isControl) {
      items.push({
        id: "mcp",
        label: "KodaDash MCP",
        icon: Terminal,
        href: "/mcp",
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.me?.account_type]);

  const infoItems: AnimatedSidebarItem[] = useMemo(
    () =>
      INFO.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        onClick: () => switchTab(item.id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <Sidebar className="border-r border-white/[0.06] bg-black">
        <SidebarHeader className="border-b border-white/[0.06] px-4 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/assets/logo.png" alt="" className="size-6 rounded-md" />
            <span className="font-display text-[15px] font-semibold tracking-[-0.025em] text-white">
              Koda<span className="text-brand-ink">Hosting</span>
            </span>
          </a>
        </SidebarHeader>

        <SidebarContent className="px-2.5 py-4">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="mb-1 h-6 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase">
              Manage
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <AnimatedSidebarNav items={manageItems} activeId={tab} />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-6 p-0">
            <SidebarGroupLabel className="mb-1 h-6 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase">
              Info
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <AnimatedSidebarNav items={infoItems} activeId={tab} />
            </SidebarGroupContent>
          </SidebarGroup>

          {props.me?.account_type !== "control" ? (
            <SidebarGroup className="mt-6 p-0">
              <SidebarGroupLabel className="mb-1 h-6 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase">
                This device
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-1">
                <AppStatusCard status={props.appStatus} />
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>

        <SidebarFooter className="border-t border-white/[0.06] p-2.5">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar className="size-7 rounded-lg">
              <AvatarImage src={avatarUrl(props.me) || undefined} alt="" />
              <AvatarFallback className="rounded-lg bg-white/[0.08] font-mono text-[11px] text-white">
                {avatarInitial(props.me)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-xs font-medium text-white">
                {props.me?.nickname || "Account"}
              </div>
              <div className="truncate text-[11px] text-zinc-500">{props.me?.email || "Signed in"}</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void props.signOut()}
              aria-label="Sign out"
              className="rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-black">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-black/80 px-4 backdrop-blur-md md:px-6">
          <SidebarTrigger className="rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white" />
          <span className="font-display text-sm font-medium text-white">Dashboard</span>
          <div className="flex-1" />
          <a href="/" className="koda-btn-pill h-8 px-3.5 text-xs whitespace-nowrap shrink-0">
            Website
            <ArrowUpRight className="size-3.5 text-zinc-400" />
          </a>
        </header>

        <div className="p-4 md:p-8">
          <div key={tab} className="page-reveal mx-auto w-full max-w-5xl">
            {props.me?.account_type === "control" ? (
              <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3.5 text-sm leading-6 text-amber-200">
                <span className="font-medium text-amber-100">Control account.</span>{" "}
                This account exists only to control servers shared with you. It becomes a full
                account automatically as soon as you create your own server in the KodaHosting app.
              </div>
            ) : null}
            {renderTab()}
          </div>
        </div>

        <SiteFooter className="mt-10 [&>div]:max-w-5xl" />
      </SidebarInset>
    </>
  );
}

export function DashboardPage() {
  const { session, ready, signOut } = useSession();
  const userId = session?.user.id || "";

  const [servers, setServers] = useState<ServerRow[]>([]);
  const [serversError, setServersError] = useState("");
  const [appStatus, setAppStatus] = useState<AppStateDetails | null>(null);
  const [dashHttps, setDashHttps] = useState(false);
  const [busyHost, setBusyHost] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});

  const [me, setMe] = useState<Me | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [deviceError, setDeviceError] = useState("");

  const [allExt, setAllExt] = useState<ExtensionItem[]>([]);
  const [mineExt, setMineExt] = useState<MyExtensionItem[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState("");

  const [overload, setOverload] = useState({ open: false, seconds: 30, nonce: 0 });

  useEffect(() => {
    setRateLimitHandler((seconds) =>
      setOverload((current) => ({ open: true, seconds, nonce: current.nonce + 1 })),
    );
    return () => setRateLimitHandler(null);
  }, []);

  const fetchServers = useCallback(async () => {
    const { data, error } = await supabase.rpc("rpc_get_servers_for_auth");
    if (error) {
      setServersError(error.message);
      return;
    }
    setServersError("");
    const rows = (data || []) as ServerRow[];
    setServers(rows);
    const appRow = rows.find((row) => row.app_state) || rows[0];
    setAppStatus(appRow ? appStateDetails(appRow.app_state, appRow.app_last_ping) : null);
  }, []);

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError("");
    setDeviceError("");
    try {
      const account = await api<{ me: Me }>("/v1/me");
      setMe(account.me);
    } catch (err) {
      setAccountError((err as Error).message);
      setAccountLoading(false);
      return;
    }
    try {
      const deviceList = await api<{ items?: DeviceRow[] }>("/v1/me/devices");
      setDevices(deviceList.items || []);
    } catch (err) {
      setDeviceError((err as Error).message);
    } finally {
      setAccountLoading(false);
    }
  }, []);

  const loadExtensions = useCallback(async () => {
    setExtLoading(true);
    setExtError("");
    try {
      const [all, mine] = await Promise.all([
        api<{ items?: ExtensionItem[] }>("/v1/extensions"),
        api<{ items?: MyExtensionItem[] }>("/v1/me/extensions"),
      ]);
      setAllExt(all.items || []);
      setMineExt(mine.items || []);
    } catch (err) {
      setExtError((err as Error).message);
    } finally {
      setExtLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setServers([]);
      setAppStatus(null);
      setMe(null);
      setDevices([]);
      setAllExt([]);
      setMineExt([]);
      setDeviceError("");
      return;
    }
    void fetchServers();
    void loadAccount();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchServers();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [userId, fetchServers, loadAccount]);

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
        setDashHttps(Boolean(value?.enabled));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function sendCommand(row: ServerRow, action: "start" | "restart" | "stop") {
    setBusyHost(row.host);
    setFeedback((current) => ({
      ...current,
      [row.host]: { tone: "ok", text: `Sending ${action}…` },
    }));
    api(`/v1/me/servers/${encodeURIComponent(row.host)}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
      .then(() => {
        setFeedback((current) => ({
          ...current,
          [row.host]: { tone: "ok", text: `${action} sent. The list refreshes in a moment.` },
        }));
        window.setTimeout(() => void fetchServers(), 3000);
      })
      .catch((err: Error) => {
        setFeedback((current) => ({
          ...current,
          [row.host]: { tone: "err", text: err.message },
        }));
      })
      .finally(() => setBusyHost(null));
  }

  function openKodaDash(row: ServerRow) {
    const url = kodadashUrl(row, dashHttps);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading the dashboard…
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LoginView />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <SidebarProvider>
        <DashboardShell
          userId={userId}
          signOut={signOut}
          me={me}
          devices={devices}
          accountLoading={accountLoading}
          accountError={accountError}
          deviceError={deviceError}
          loadAccount={loadAccount}
          servers={servers}
          serversError={serversError}
          appStatus={appStatus}
          busyHost={busyHost}
          feedback={feedback}
          sendCommand={sendCommand}
          openKodaDash={openKodaDash}
          fetchServers={fetchServers}
          allExt={allExt}
          mineExt={mineExt}
          extLoading={extLoading}
          extError={extError}
          loadExtensions={loadExtensions}
        />
      </SidebarProvider>
      <OverloadDialog
        open={overload.open}
        seconds={overload.seconds}
        nonce={overload.nonce}
        onDismiss={() => setOverload((current) => ({ ...current, open: false }))}
      />
      <Toaster position="bottom-right" />
    </>
  );
}
