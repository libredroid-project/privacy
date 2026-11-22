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
import { AnimatedSidebarNav, type AnimatedSidebarItem } from "@/components/animated-sidebar-nav";
import { AnimatedSwitch } from "@/components/animated-switch";
import { ErrorState } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";
import type { DevExtension, DeveloperMe } from "@/developer/types";
import {
  displayStatus,
  displayStatusDotClasses,
  formatBytes,
  formatDate,
  formatDateTime,
  isEnded,
  latestVersion,
  statusDotClasses,
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
import { safeImageUrl } from "@/lib/security";
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
    <AnimatedSwitch<string>
      ariaLabel="Filter extensions by status"
      size="sm"
      value={value}
      onChange={onChange}
      options={items.map((item) => {
        const label = item === "all" ? "All" : item.charAt(0) + item.slice(1).toLowerCase();
        return {
          id: item,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <span>{label}</span>
              <span className="font-mono text-[11px] opacity-65 tabular">{counts[item] ?? 0}</span>
            </span>
          ),
        };
      })}
    />
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
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
            Extensions
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Store listing, releases, and package source for everything you publish.
          </p>
        </div>
        <button type="button" onClick={onNew} className="koda-btn-black h-9 px-4 text-xs">
          <Plus className="size-3.5" /> New extension
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilters value={status} onChange={setStatus} counts={counts} />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or id"
            className="h-9 rounded-full border-zinc-200 bg-zinc-100/70 pl-9 text-xs text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400/50 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white dark:placeholder:text-zinc-500 dark:focus-visible:ring-white/20"
            aria-label="Search extensions"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="resend-glass-panel rounded-2xl p-12 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-white/[0.05] dark:text-zinc-400">
            <PackageOpen className="size-5" />
          </div>
          <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            {extensions.length === 0 ? "No extensions yet" : "Nothing matches this filter"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            {extensions.length === 0
              ? "Upload a .kodaext package to get started. The first version goes through review."
              : "Clear the search or pick another status."}
          </p>
          {extensions.length === 0 ? (
            <button type="button" onClick={onNew} className="koda-btn-black mt-5 h-9 px-4 text-xs">
              <Plus className="size-3.5" /> New extension
            </button>
          ) : null}
        </div>
      ) : (
        <div className="resend-glass-panel overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/80 font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <th className="px-5 py-3 font-medium">Extension</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Latest</th>
                  <th className="px-4 py-3 font-medium">Downloads</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                {filtered.map((ext) => {
                  const latest = latestVersion(ext);
                  const iconSrc = safeImageUrl(ext.icon_url);
                  const tone = displayStatusDotClasses(ext);
                  return (
                    <tr
                      key={ext.ext_id}
                      className="group cursor-pointer transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                      onClick={() => onOpen(ext.ext_id)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 font-display text-xs font-medium text-zinc-700 ring-1 ring-black/[0.06] dark:bg-white/[0.06] dark:text-white dark:ring-white/[0.08]">
                            {iconSrc ? (
                              <img src={iconSrc} alt="" className="size-full object-cover" />
                            ) : (
                              ext.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-medium text-zinc-950 dark:text-white">
                              {ext.name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-zinc-500">
                              {ext.ext_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-medium", tone.text)}>
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {displayStatus(ext)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-700 tabular dark:text-zinc-300">
                        {latest ? `v${latest.version} (${latest.version_code})` : "-"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-500 tabular">
                        {ext.downloads.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-500 tabular">
                        {formatDate(ext.updated_at)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ChevronRight className="ml-auto size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
  const tone = displayStatusDotClasses(ext);
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
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> All extensions
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 font-display text-base font-medium text-zinc-800 ring-1 ring-black/[0.07] dark:bg-white/[0.06] dark:text-white dark:ring-white/[0.09]">
              {safeImageUrl(ext.icon_url) ? (
                <img src={safeImageUrl(ext.icon_url)!} alt="" className="size-full object-cover" />
              ) : (
                ext.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="truncate font-display text-xl font-medium tracking-[-0.02em] text-zinc-950 dark:text-white">
                  {ext.name}
                </h1>
                <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-medium", tone.text)}>
                  <span className={cn("size-1.5 rounded-full", tone.dot)} />
                  {displayStatus(ext)}
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
                {ext.ext_id}
                {latest ? ` · v${latest.version} (${latest.version_code})` : ""} ·{" "}
                {ext.downloads.toLocaleString()} downloads
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/store?ext=${encodeURIComponent(ext.ext_id)}`;
                void navigator.clipboard?.writeText(link);
                toast.success("Store link copied.");
              }}
              className="koda-btn-pill h-8 px-3.5 text-xs"
            >
              <Copy className="size-3.5" /> Copy link
            </button>
            {ext.status === "APPROVED" ? (
              <a
                href={`/store?ext=${encodeURIComponent(ext.ext_id)}`}
                className="koda-btn-black h-8 px-3.5 text-xs"
              >
                View in store <ExternalLink className="size-3.5 opacity-80" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {ext.review_note && isEnded(ext.status) ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 dark:bg-red-500/10">
          <p className="font-display text-sm font-medium text-red-700 dark:text-red-400">
            {ext.status === "REJECTED" ? "Review rejected this extension" : "Delisted"}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{ext.review_note}</p>
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
          <AnimatedSwitch<WorkspaceTab>
            role="tablist"
            ariaLabel="Extension workspace sections"
            size="sm"
            value={tab}
            onChange={onTab}
            options={tabs}
          />

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
                <div className="resend-glass-panel flex items-center justify-center gap-2 rounded-2xl p-16 text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="size-4 animate-spin" /> Loading the editor...
                </div>
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
        <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
          Releases
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every version across your extensions, newest first.
        </p>
      </div>

      <AnimatedSwitch<string>
        ariaLabel="Filter releases by status"
        size="sm"
        value={filter}
        onChange={setFilter}
        options={["ALL", "PENDING", "APPROVED", "REJECTED"].map((item) => ({
          id: item,
          label: item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase(),
        }))}
      />

      {rows.length === 0 ? (
        <div className="resend-glass-panel rounded-2xl p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No release matches this filter.
        </div>
      ) : (
        <div className="resend-glass-panel overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/80 font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <th className="px-5 py-3 font-medium">Extension</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium">Review note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                {rows.map(({ ext, version }) => {
                  const tone = statusDotClasses(version.status);
                  return (
                    <tr
                      key={`${ext.ext_id}-${version.version_code}`}
                      className="cursor-pointer transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                      onClick={() => onOpen(ext.ext_id)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="truncate font-display text-sm font-medium text-zinc-950 dark:text-white">
                          {ext.name}
                        </p>
                        <p className="truncate font-mono text-[11px] text-zinc-500">{ext.ext_id}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-700 tabular dark:text-zinc-300">
                        {version.version} ({version.version_code})
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-medium", tone.text)}>
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {version.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-500 tabular">
                        {formatBytes(version.file_size)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-500 tabular">
                        {formatDateTime(version.created_at)}
                      </td>
                      <td className="max-w-[260px] px-4 py-3.5">
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {version.review_note || "-"}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
        <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
          Account
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The KodaHosting account that publishes under your name.
        </p>
      </div>

      <VerifyEmail me={me} onVerified={() => { onVerified(); onReloadMe(); }} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="resend-glass-panel rounded-2xl p-6">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Account details
          </h2>
          <dl className="mt-4 divide-y divide-zinc-200/70 text-sm dark:divide-white/[0.06]">
            <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
              <dt className="text-zinc-500">E-mail</dt>
              <dd className="truncate font-mono text-xs text-zinc-900 dark:text-zinc-100">
                {me?.email || "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-zinc-500">Status</dt>
              <dd
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-xs",
                  me?.email_verified
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-300",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    me?.email_verified ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400",
                  )}
                />
                {me?.email_verified ? "Verified" : "Not verified"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-zinc-500">Member since</dt>
              <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                {formatDate(me?.member_since)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-zinc-500">Extensions</dt>
              <dd className="font-mono text-xs tabular-nums text-zinc-900 dark:text-zinc-100">
                {extensions.length}
              </dd>
            </div>
            {me?.mc_username ? (
              <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                <dt className="text-zinc-500">Minecraft name</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">{me.mc_username}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200/70 pt-4 dark:border-white/[0.06]">
            <a href="/dashboard" className="koda-btn-pill h-8 px-3.5 text-xs">
              Dashboard
            </a>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-600 transition-colors hover:bg-black/[0.05] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>

        <div className="resend-glass-panel flex flex-col justify-between rounded-2xl p-6">
          <div>
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Publishing rules
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <p>
                Every new extension and release is reviewed by hand before appearing in the store. You get the decision in the app and the exact reason stays visible here.
              </p>
              <p>
                Each package must contain a valid <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.08]">manifest.json</code> matching the extension id, announced versionCode, and license.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200/70 pt-4 dark:border-white/[0.06]">
            <a href="/docs" className="koda-btn-pill h-8 px-3.5 text-xs">
              Documentation
            </a>
            <a
              href="https://github.com/libredroid-project/KodaNetwork/tree/main/extensions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-600 transition-colors hover:bg-black/[0.05] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              Extension examples <ExternalLink className="size-3.5 opacity-75" />
            </a>
          </div>
        </div>
      </div>
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
  const [submitOpen, setSubmitOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("new") === "1" || params.get("submit") === "1";
  });
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem("koda_console_theme") === "light";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("new") || url.searchParams.has("submit")) {
      url.searchParams.delete("new");
      url.searchParams.delete("submit");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

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

  const consoleNavItems: AnimatedSidebarItem[] = useMemo(
    () =>
      NAV.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        onClick: () => switchView(item.id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const resourceItems: AnimatedSidebarItem[] = useMemo(
    () => [
      { id: "docs", label: "Documentation", icon: BookOpen, href: "/docs" },
      { id: "store", label: "Store", icon: Puzzle, href: "/store" },
      { id: "support-mail", label: "Email support", icon: LifeBuoy, href: "mailto:support@kodaserv.eu" },
    ],
    [],
  );

  return (
    <>
      <SidebarProvider>
        <Sidebar className="border-r border-zinc-200 bg-zinc-50 dark:border-white/[0.06] dark:bg-black">
          <div aria-hidden="true" className="dev-rainbow-line h-[3px] w-full shrink-0" />
          <SidebarHeader className="border-b border-zinc-200/80 px-4 py-4 dark:border-white/[0.06]">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/assets/logo.png" alt="" className="size-6 rounded-md" />
              <span className="font-display text-[15px] font-semibold tracking-[-0.025em] text-zinc-950 dark:text-white">
                Koda<span className="text-brand-ink">Hosting</span>
              </span>
            </a>
          </SidebarHeader>

          <SidebarContent className="px-2.5 py-4">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="mb-1 h-6 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-600">
                Console
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <AnimatedSidebarNav
                  items={consoleNavItems}
                  activeId={route.view === "account" ? null : route.view}
                />
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6 p-0">
              <SidebarGroupLabel className="mb-1 h-6 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-600">
                Resources
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <AnimatedSidebarNav items={resourceItems} activeId={null} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-zinc-200/80 p-2.5 dark:border-white/[0.06]">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={route.view === "account"}
                  onClick={() => switchView("account")}
                  className={cn(
                    "relative h-auto rounded-lg px-2.5 py-2 font-display transition-colors",
                    route.view === "account"
                      ? "!bg-black/[0.06] !text-zinc-950 dark:!bg-white/[0.065] dark:!text-white"
                      : "text-zinc-600 hover:!bg-black/[0.04] hover:!text-zinc-950 dark:text-zinc-300 dark:hover:!bg-white/[0.04] dark:hover:!text-white",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.07] font-mono text-[11px] font-medium text-zinc-950 dark:bg-white/[0.08] dark:text-white">
                    {(me?.email || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs font-medium text-zinc-950 dark:text-white">
                      {me?.mc_username || "Account"}
                    </div>
                    <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                      {me?.email || "Developer settings"}
                    </div>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-600" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-white text-zinc-950 dark:bg-black dark:text-zinc-100">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/85 px-4 backdrop-blur-md dark:border-white/[0.06] dark:bg-black/80 md:px-6">
            <SidebarTrigger className="rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white" />
            <span className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Developer console
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setLight((value) => !value)}
              aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
              className="koda-btn-pill h-8 shrink-0 px-3 text-xs whitespace-nowrap"
            >
              {light ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
              {light ? "Dark" : "Light"}
            </button>
            <a
              href="/dashboard"
              className="koda-btn-pill h-8 shrink-0 px-3.5 text-xs whitespace-nowrap"
            >
              Dashboard <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </header>

          <div className="p-4 md:p-8">
            <div
              key={`${route.view}:${route.extId ?? ""}:${route.tab}:${route.release ? "new" : ""}`}
              className="page-reveal mx-auto w-full max-w-5xl"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="size-4 animate-spin" /> Loading your extensions...
                </div>
              ) : error ? (
                <ErrorState
                  code="CONSOLE UNAVAILABLE"
                  title="The console could not load"
                  description="We could not reach the KodaHosting developer API. Check your network connection and try again."
                  detail={error}
                  onRetry={onReload}
                  secondaryAction={
                    <a href="/dashboard" className="koda-btn-pill h-9 px-4 text-xs">
                      Open dashboard
                    </a>
                  }
                />
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
