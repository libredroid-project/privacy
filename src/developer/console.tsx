import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronRight,
  Copy,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Moon,
  PackageOpen,
  Plus,
  Puzzle,
  Rocket,
  Search,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/sidebar";
import { SiteFooter } from "@/components/site-footer";
import type { DevExtension, DeveloperMe } from "@/developer/types";
import {
  displayStatus,
  displayStatusTone,
  formatBytes,
  formatDate,
  formatDateTime,
  isEnded,
  latestVersion,
  statusTone,
} from "@/developer/types";
import { DeveloperOverview } from "@/developer/overview";
import { VerifyEmail } from "@/developer/verify-email";
import { ListingEditor } from "@/developer/listing-editor";
import { VersionsPanel } from "@/developer/versions";
import { DeveloperSupport } from "@/developer/support";
import { DeveloperAnalytics } from "@/developer/analytics";
import { ReleaseScreen } from "@/developer/release-screen";
import { SubmitDialog } from "@/store/submit-dialog";
import type { MyExtension } from "@/store/types";
import { cn } from "@/lib/utils";

type View = "overview" | "extensions" | "releases" | "analytics" | "support" | "account";
type WorkspaceTab = "listing" | "releases" | "code";

interface ConsoleRoute {
  view: View;
  extId: string | null;
  tab: WorkspaceTab;
  release: boolean;
}

const SIMPLE_VIEWS: View[] = ["releases", "analytics", "support", "account"];

function parseRoute(pathname: string): ConsoleRoute {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const rest = parts[0] === "developer" ? parts.slice(1) : [];
  const empty: ConsoleRoute = { view: "overview", extId: null, tab: "listing", release: false };

  if (rest[0] === "extensions") {
    if (!rest[1]) return { ...empty, view: "extensions" };
    const tabPart = rest[2] || "listing";
    const tab: WorkspaceTab = tabPart === "code" ? "code" : tabPart === "releases" ? "releases" : "listing";
    return {
      view: "extensions",
      extId: decodeURIComponent(rest[1]),
      tab,
      release: tab === "releases" && rest[3] === "new",
    };
  }
  if (rest[0] && SIMPLE_VIEWS.includes(rest[0] as View)) {
    return { ...empty, view: rest[0] as View };
  }
  return empty;
}

function routePath(route: ConsoleRoute): string {
  if (route.view === "overview") return "/developer";
  if (route.view === "extensions") {
    if (!route.extId) return "/developer/extensions";
    const base = `/developer/extensions/${encodeURIComponent(route.extId)}/${route.tab}`;
    return route.release ? `${base}/new` : base;
  }
  return `/developer/${route.view}`;
}

function navigate(route: ConsoleRoute, replace = false) {
  const path = routePath(route);
  if (window.location.pathname !== path) {
    if (replace) window.history.replaceState({}, "", path);
    else window.history.pushState({}, "", path);
  }
  return route;
}

// CodeMirror + fflate are only needed when the editor tab is open
const CodeEditor = lazy(() =>
  import("@/developer/editor").then((module) => ({ default: module.CodeEditor })),
);

const NAV: { id: View; label: string; icon: typeof Puzzle }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "extensions", label: "Extensions", icon: Puzzle },
  { id: "releases", label: "Releases", icon: Rocket },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "support", label: "Support", icon: LifeBuoy },
];

function StatusFilters({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  const items = ["all", "APPROVED", "PENDING", "REJECTED", "WITHDRAWN"];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = value === item;
        const label = item === "all" ? "All" : item.charAt(0) + item.slice(1).toLowerCase();
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-foreground/20 bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
            <span className={cn("ml-1.5", active ? "text-background/60" : "text-muted-foreground")}>
              {counts[item] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ExtensionList({
  extensions,
  onOpen,
  onNew,
}: {
  extensions: DevExtension[];
  onOpen: (extId: string) => void;
  onNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: extensions.length };
    for (const ext of extensions) next[ext.status] = (next[ext.status] || 0) + 1;
    return next;
  }, [extensions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return extensions.filter((ext) => {
      if (status !== "all" && ext.status !== status) return false;
      if (!term) return true;
      return (
        ext.name.toLowerCase().includes(term) ||
        ext.ext_id.toLowerCase().includes(term) ||
        (ext.author || "").toLowerCase().includes(term)
      );
    });
  }, [extensions, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Extensions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store listing, releases and code for everything you publish.
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus className="size-4" /> New extension
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilters value={status} onChange={setStatus} counts={counts} />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or id"
            className="pl-8"
            aria-label="Search extensions"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="gap-0 p-10 text-center shadow-none">
          <PackageOpen className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {extensions.length === 0 ? "No extensions yet" : "Nothing matches this filter"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {extensions.length === 0
              ? "Upload a .kodaext package to start. The first version goes through the normal review."
              : "Clear the search or pick another status."}
          </p>
          {extensions.length === 0 ? (
            <Button size="sm" className="mt-4" onClick={onNew}>
              <Plus className="size-4" /> New extension
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Extension</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Latest</th>
                  <th className="px-4 py-3 font-medium">Downloads</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ext) => {
                  const latest = latestVersion(ext);
                  return (
                    <tr
                      key={ext.ext_id}
                      className="cursor-pointer border-b last:border-0 hover:bg-accent/30"
                      onClick={() => onOpen(ext.ext_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-xs font-medium">
                            {ext.icon_url ? (
                              <img src={ext.icon_url} alt="" className="size-full object-cover" />
                            ) : (
                              ext.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{ext.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {ext.ext_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`font-normal ${displayStatusTone(ext)}`}>
                          {displayStatus(ext)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {latest ? `v${latest.version} (${latest.version_code})` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {ext.downloads.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(ext.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Workspace({
  ext,
  tab,
  releaseOpen,
  onTab,
  onBack,
  onReleaseChange,
  onChanged,
}: {
  ext: DevExtension;
  tab: WorkspaceTab;
  releaseOpen: boolean;
  onTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onReleaseChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const latest = latestVersion(ext);
  const tabs: { id: WorkspaceTab; label: string }[] = [
    { id: "listing", label: "Store listing" },
    { id: "releases", label: "Releases" },
    { id: "code", label: "Code editor" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All extensions
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-base font-medium">
              {ext.icon_url ? (
                <img src={ext.icon_url} alt="" className="size-full object-cover" />
              ) : (
                ext.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight">{ext.name}</h1>
                <Badge variant="outline" className={`font-normal ${displayStatusTone(ext)}`}>
                  {displayStatus(ext)}
                </Badge>
              </div>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {ext.ext_id}
                {latest ? ` · v${latest.version} (${latest.version_code})` : ""} ·{" "}
                {ext.downloads.toLocaleString()} downloads
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = `${window.location.origin}/store?ext=${encodeURIComponent(ext.ext_id)}`;
                void navigator.clipboard?.writeText(link);
                toast.success("Store link copied.");
              }}
            >
              <Copy className="size-4" /> Copy link
            </Button>
            {ext.status === "APPROVED" ? (
              <Button asChild variant="outline" size="sm">
                <a href={`/store?ext=${encodeURIComponent(ext.ext_id)}`}>
                  View in store <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {ext.review_note && isEnded(ext.status) ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            {ext.status === "REJECTED" ? "Review rejected this extension" : "Delisted"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{ext.review_note}</p>
        </div>
      ) : null}

      {releaseOpen ? (
        <ReleaseScreen
          ext={ext}
          onBack={() => {
            onReleaseChange(false);
            onTab("releases");
          }}
          onPublished={onChanged}
          onEditListing={() => {
            onReleaseChange(false);
            onTab("listing");
          }}
        />
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTab(item.id)}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors",
                  tab === item.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "listing" ? <ListingEditor ext={ext} onSaved={onChanged} /> : null}
          {tab === "releases" ? (
            <VersionsPanel
              ext={ext}
              onChanged={onChanged}
              onEditCode={() => onTab("code")}
              onNewRelease={() => onReleaseChange(true)}
            />
          ) : null}
          {tab === "code" ? (
            <Suspense
              fallback={
                <Card className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground shadow-none">
                  <Loader2 className="size-4 animate-spin" /> Loading the editor…
                </Card>
              }
            >
              <CodeEditor ext={ext} onPublished={onChanged} />
            </Suspense>
          ) : null}
        </>
      )}
    </div>
  );
}

function ReleasesView({
  extensions,
  onOpen,
}: {
  extensions: DevExtension[];
  onOpen: (extId: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const rows = useMemo(() => {
    const all = extensions.flatMap((ext) =>
      ext.versions.map((version) => ({ ext, version })),
    );
    all.sort((a, b) => {
      const at = a.version.created_at ? Date.parse(a.version.created_at) : 0;
      const bt = b.version.created_at ? Date.parse(b.version.created_at) : 0;
      return bt - at;
    });
    if (filter === "ALL") return all;
    return all.filter((row) => row.version.status === filter);
  }, [extensions, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Releases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every version across your extensions, newest first.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === item
                ? "border-foreground/20 bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-none">
          No release matches this filter.
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Extension</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium">Review note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ext, version }) => (
                  <tr
                    key={`${ext.ext_id}-${version.version_code}`}
                    className="cursor-pointer border-b last:border-0 hover:bg-accent/30"
                    onClick={() => onOpen(ext.ext_id)}
                  >
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{ext.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{ext.ext_id}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {version.version} ({version.version_code})
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`font-normal ${statusTone(version.status)}`}>
                        {version.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatBytes(version.file_size)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(version.created_at)}
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate text-xs text-muted-foreground">{version.review_note || "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AccountView({
  me,
  extensions,
  onVerified,
  onReloadMe,
  signOut,
}: {
  me: DeveloperMe | null;
  extensions: DevExtension[];
  onVerified: () => void;
  onReloadMe: () => void;
  signOut: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The KodaHosting account that publishes under your name.
        </p>
      </div>

      <VerifyEmail me={me} onVerified={() => { onVerified(); onReloadMe(); }} />

      <Card className="gap-0 p-5 shadow-none">
        <h2 className="text-sm font-semibold">Account details</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">E-mail</dt>
            <dd className="mt-0.5 truncate">{me?.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5">{me?.email_verified ? "Verified" : "Not verified"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Member since</dt>
            <dd className="mt-0.5">{formatDate(me?.member_since)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Extensions</dt>
            <dd className="mt-0.5">{extensions.length}</dd>
          </div>
          {me?.mc_username ? (
            <div>
              <dt className="text-xs text-muted-foreground">Minecraft name</dt>
              <dd className="mt-0.5">{me.mc_username}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard">Dashboard</a>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </Card>

      <Card className="gap-0 p-5 shadow-none">
        <h2 className="text-sm font-semibold">Publishing</h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>
            Every new extension and every release is reviewed by hand before it appears in the store.
            You get the decision as an in-app notification and the reason is always shown here in the
            console.
          </p>
          <p>
            A package must contain a manifest.json with the same id as the extension, the announced
            versionCode and a license. The app checks it before installing.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/docs">Documentation</a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions">
              Extension examples <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function DeveloperConsole({
  me,
  extensions,
  loading,
  error,
  signOut,
  onReload,
  onReloadMe,
}: {
  me: DeveloperMe | null;
  extensions: DevExtension[];
  loading: boolean;
  error: string;
  signOut: () => void;
  onReload: () => void;
  onReloadMe: () => void;
}) {
  const [route, setRoute] = useState<ConsoleRoute>(() => parseRoute(window.location.pathname));
  const [submitOpen, setSubmitOpen] = useState(false);
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem("koda_console_theme") === "light";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !light);
    try {
      localStorage.setItem("koda_console_theme", light ? "light" : "dark");
    } catch {
      // private mode, the toggle still works for this visit
    }
  }, [light]);

  useEffect(() => {
    const onPop = () => {
      setRoute(parseRoute(window.location.pathname));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const active = extensions.find((ext) => ext.ext_id === route.extId) || null;

  function go(next: ConsoleRoute, replace = false) {
    setRoute(navigate(next, replace));
    window.scrollTo({ top: 0 });
  }

  function openExtension(extId: string) {
    go({ view: "extensions", extId, tab: "listing", release: false });
  }

  function switchView(next: View) {
    go({ view: next, extId: null, tab: "listing", release: false });
  }

  const mineItems: MyExtension[] = extensions.map((ext) => ({
    ext_id: ext.ext_id,
    name: ext.name,
    status: ext.status,
    review_note: ext.review_note ?? undefined,
    downloads: ext.downloads,
    versions: ext.versions.map((version) => ({
      version: version.version,
      version_code: version.version_code,
    })),
  }));

  return (
    <>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <a href="/" className="flex items-center gap-2.5 px-2 py-1.5">
              <img src="/assets/logo.png" alt="" className="size-7 rounded-md" />
              <span className="text-sm font-semibold">
                Koda<span className="text-brand-ink">Hosting</span>
              </span>
            </a>
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Developer console
            </p>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Console</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={route.view === item.id}
                        onClick={() => switchView(item.id)}
                        className={
                          route.view === item.id
                            ? "!bg-brand/10 font-medium !text-brand-ink dark:!text-brand"
                            : undefined
                        }
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => (window.location.href = "/docs")}>
                      <BookOpen />
                      <span>Documentation</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => (window.location.href = "/store")}>
                      <Puzzle />
                      <span>Store</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => (window.location.href = "mailto:support@kodaserv.eu")}>
                      <LifeBuoy />
                      <span>Email support</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={route.view === "account"} onClick={() => switchView("account")}>
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                    {(me?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{me?.email || "Account"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-card px-4 md:px-6">
            <SidebarTrigger />
            <span className="text-sm font-medium">Developer console</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLight((value) => !value)}
              aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
            >
              {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
              {light ? "Dark" : "Light"}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/dashboard">
                Dashboard <ExternalLink className="size-4" />
              </a>
            </Button>
          </header>
          <div className="h-px w-full bg-gradient-to-r from-brand/70 via-violet-500/50 to-sky-500/50" />

          <div className="p-4 md:p-8">
            <div className="mx-auto w-full max-w-5xl">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading your extensions…
                </div>
              ) : error ? (
                <Card className="gap-3 p-6 shadow-none">
                  <p className="text-sm font-medium">The console could not load.</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button size="sm" variant="outline" onClick={onReload}>
                    Try again
                  </Button>
                </Card>
              ) : route.view === "overview" ? (
                <DeveloperOverview
                  me={me}
                  extensions={extensions}
                  onOpenExtension={openExtension}
                  onNew={() => setSubmitOpen(true)}
                  onVerified={onReloadMe}
                  onShowAccount={() => switchView("account")}
                />
              ) : route.view === "extensions" ? (
                active ? (
                  <Workspace
                    ext={active}
                    tab={route.tab}
                    releaseOpen={route.release}
                    onTab={(next) => go({ ...route, tab: next, release: false })}
                    onBack={() => go({ ...route, extId: null, tab: "listing", release: false })}
                    onReleaseChange={(open) => go({ ...route, release: open })}
                    onChanged={onReload}
                  />
                ) : (
                  <ExtensionList
                    extensions={extensions}
                    onOpen={openExtension}
                    onNew={() => setSubmitOpen(true)}
                  />
                )
              ) : route.view === "releases" ? (
                <ReleasesView extensions={extensions} onOpen={openExtension} />
              ) : route.view === "analytics" ? (
                <DeveloperAnalytics extensions={extensions} />
              ) : route.view === "support" ? (
                <DeveloperSupport extensions={extensions} />
              ) : (
                <AccountView
                  me={me}
                  extensions={extensions}
                  onVerified={onReloadMe}
                  onReloadMe={onReloadMe}
                  signOut={signOut}
                />
              )}
            </div>
          </div>

          <SiteFooter className="mt-10 [&>div]:max-w-5xl" />
        </SidebarInset>
      </SidebarProvider>

      <SubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        mineItems={mineItems}
        onSubmitted={onReload}
      />
    </>
  );
}
