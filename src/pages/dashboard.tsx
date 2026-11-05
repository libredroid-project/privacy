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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
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

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <a href="/" className="flex items-center gap-2.5 px-2 py-1.5">
            <img src="/assets/logo.png" alt="" className="size-7 rounded-md" />
            <span className="text-sm font-semibold">
              Koda<span className="text-brand-ink">Hosting</span>
            </span>
          </a>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Manage</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MANAGE.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={tab === item.id} onClick={() => switchTab(item.id)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Info</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {INFO.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={tab === item.id} onClick={() => switchTab(item.id)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>This device</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <AppStatusCard status={props.appStatus} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-1">
            <Avatar className="size-8">
              <AvatarImage src={avatarUrl(props.me) || undefined} alt="" />
              <AvatarFallback className="text-xs">{avatarInitial(props.me)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{props.me?.nickname || "Account"}</div>
              <div className="truncate text-[11px] text-muted-foreground">{props.me?.email}</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void props.signOut()}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-card px-4 md:px-6">
          <SidebarTrigger />
          <span className="text-sm font-medium">Dashboard</span>
          <div className="flex-1" />
          <Button asChild variant="ghost" size="sm">
            <a href="/">
              Website
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </header>

        <div className="p-4 md:p-8">
          <div className="mx-auto w-full max-w-5xl">{renderTab()}</div>
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
    window.open(kodadashUrl(row, dashHttps), "_blank", "noopener");
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
