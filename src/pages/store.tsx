import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { AnimatedSwitch } from "@/components/animated-switch";
import { ErrorState } from "@/components/error-state";
import { OverloadDialog } from "@/components/overload-dialog";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { api, publicApi, setRateLimitHandler } from "@/lib/api";
import { plural } from "@/lib/format";
import { safeImageUrl } from "@/lib/security";
import { applyDocumentSeo, SEO_PAGES } from "@/lib/seo";
import { DetailDialog } from "@/store/detail-dialog";
import { LoginDialog } from "@/store/login-dialog";
import { MyExtensions } from "@/store/my-extensions";
import { useSession } from "@/store/use-session";
import type { CatalogItem, MyExtension, StoreStatus } from "@/store/types";
import { CATEGORIES } from "@/store/types";
import { cn } from "@/lib/utils";

function StoreIcon({ url, name }: { url?: string; name: string }) {
  const safeUrl = safeImageUrl(url);
  if (safeUrl) {
    return (
      <img
        src={safeUrl}
        alt=""
        className="size-11 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] font-display text-sm font-semibold text-white">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function updateQuery(updates: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  history.replaceState(null, "", url.pathname + url.search);
}

export function StorePage() {
  const params = new URLSearchParams(window.location.search);
  const { session, ready, signOut } = useSession();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [publisher, setPublisher] = useState(() => (params.get("author") || "").trim());

  const [detailId, setDetailId] = useState<string | null>(() => params.get("ext"));
  const [loginOpen, setLoginOpen] = useState(false);
  const [afterLogin, setAfterLogin] = useState<"mine" | null>(null);

  const [mine, setMine] = useState<MyExtension[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState("");
  const [mineNonce, setMineNonce] = useState(0);

  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [overload, setOverload] = useState({ open: false, seconds: 30, nonce: 0 });

  useEffect(() => {
    setRateLimitHandler((seconds) =>
      setOverload((current) => ({ open: true, seconds, nonce: current.nonce + 1 })),
    );
    return () => setRateLimitHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    publicApi<{ items?: CatalogItem[] }>("/v1/extensions")
      .then((data) => {
        if (!cancelled) setItems(data.items || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  useEffect(() => {
    let cancelled = false;
    setStatusError(false);
    publicApi<StoreStatus>("/v1/status")
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatusError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      setMine([]);
      setMineError("");
      setMineLoading(false);
      return;
    }
    let cancelled = false;
    setMineLoading(true);
    setMineError("");
    api<{ items?: MyExtension[] }>("/v1/me/extensions")
      .then((data) => {
        if (!cancelled) setMine(data.items || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setMineError(err.message);
      })
      .finally(() => {
        if (!cancelled) setMineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, session?.user.id, mineNonce]);

  useEffect(() => {
    const baseSeo = SEO_PAGES["store.html"];
    if (publisher) {
      applyDocumentSeo({
        title: `${publisher} | KodaHosting Extension Store`,
        description: `Browse verified KodaHosting extensions published by ${publisher}.`,
      });
    } else {
      applyDocumentSeo({
        title: baseSeo.title,
        description: baseSeo.description,
        ogTitle: baseSeo.ogTitle,
        ogDescription: baseSeo.ogDescription,
        twitterTitle: baseSeo.twitterTitle,
        twitterDescription: baseSeo.twitterDescription,
      });
    }
  }, [publisher]);

  const refreshMine = useCallback(() => setMineNonce((value) => value + 1), []);

  function openDetail(extId: string) {
    setDetailId(extId);
    updateQuery({ ext: extId });
  }

  function closeDetail() {
    setDetailId(null);
    updateQuery({ ext: null });
  }

  function applyPublisher(author: string) {
    setPublisher(author);
    updateQuery({ author: author || null });
  }

  function loginSuccess() {
    const intent = afterLogin;
    setAfterLogin(null);
    if (intent === "mine") {
      window.setTimeout(() => {
        document.getElementById("mine")?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }

  async function withdraw(extId: string) {
    try {
      await api(`/v1/extensions/${encodeURIComponent(extId)}/withdraw`, { method: "POST" });
      refreshMine();
      setReloadNonce((value) => value + 1);
      toast.success("Extension withdrawn.");
    } catch (err) {
      toast.error("Could not withdraw: " + (err as Error).message);
      throw err;
    }
  }

  const term = search.trim().toLowerCase();
  const visible = items.filter((item) => {
    if (publisher && (item.author || "") !== publisher) return false;
    if (category !== "all" && item.category !== category) return false;
    if (!term) return true;
    return `${item.name} ${item.summary || ""} ${item.author || ""}`.toLowerCase().includes(term);
  });
  const publisherCount = publisher
    ? items.filter((item) => (item.author || "") === publisher).length
    : 0;

  const emptyText = publisher
    ? "This publisher has no extensions in the store right now."
    : term || category !== "all"
      ? "No extensions match this search."
      : "Nothing here yet. The first extensions will appear after review.";

  const statusLine = status
    ? `API online · ${status.servers?.total ?? 0} servers · ${status.servers?.players_online ?? 0} players · ${plural(status.extensions?.published ?? 0, "extension")}`
    : statusError
      ? "API status unavailable"
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader
        active="store"
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
        <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6">
          <div className="flex flex-col justify-between gap-6 pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs text-brand-ink">Verified .kodaext registry</p>
              <h1 className="resend-title mt-2 font-display text-3xl font-medium tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                {publisher ? publisher : "Extension Store"}
              </h1>
              {publisher ? null : (
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-zinc-400">
                  Language packs, themes, tools, and interface add-ons for KodaHosting. Every
                  package release is checked manually before listing.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setReloadNonce((value) => value + 1)}
                disabled={loading}
                className="koda-btn-pill h-9 px-3.5 text-xs whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                Refresh
              </button>
              <a
                href="/developer?new=1"
                className="koda-btn-black h-9 px-4 text-xs whitespace-nowrap shrink-0"
              >
                <Plus className="size-3.5 text-brand-ink" />
                Submit extension
              </a>
            </div>
          </div>

          {publisher ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#09090b] px-4 py-3">
              <div className="text-sm">
                <span className="font-medium text-white">{publisher}</span>
                <span className="text-zinc-400">
                  {" · "}
                  {publisherCount} {publisherCount === 1 ? "published extension" : "published extensions"}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => applyPublisher("")}>
                Show all
              </Button>
            </div>
          ) : null}

          {status?.maintenance?.active ? (
            <Alert className="mt-6 tone-pending">
              <AlertTitle>Maintenance in progress</AlertTitle>
              <AlertDescription>{status.maintenance.reason || "Some features may be unavailable."}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, summary or author"
                className="h-10 rounded-full border-0 bg-white/[0.06] pl-10 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
                aria-label="Search extensions"
              />
            </div>

            <AnimatedSwitch<string>
              role="group"
              ariaLabel="Extension categories"
              size="sm"
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map(([value, label]) => ({ id: value, label }))}
            />
          </div>

          <div className="mt-6 font-mono text-xs text-zinc-500 tabular">
            {loading ? "Loading registry…" : `${visible.length} ${visible.length === 1 ? "extension" : "extensions"}`}
          </div>

          <div className="mt-4">
            {error ? (
              <ErrorState
                code="REGISTRY UNAVAILABLE"
                title="The store could not be loaded"
                description="We could not reach the KodaHosting extension catalog right now."
                detail={error}
                onRetry={() => setReloadNonce((value) => value + 1)}
              />
            ) : loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-2xl bg-[#09090b] p-5">
                    <div className="flex gap-3">
                      <Skeleton className="size-11 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="mt-4 h-3 w-full" />
                    <Skeleton className="mt-2 h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl bg-[#09090b] p-12 text-center text-sm text-zinc-400">
                {emptyText}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item, index) => (
                  <Reveal key={item.ext_id} delay={Math.min(index * 35, 210)} className="h-full">
                    <button
                      type="button"
                      onClick={() => openDetail(item.ext_id)}
                      className="group flex h-full w-full flex-col justify-between rounded-2xl bg-[#09090b] p-5 text-left transition-colors duration-150 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-white/40"
                    >
                      <div>
                        <div className="flex items-start gap-3">
                          <StoreIcon url={item.icon_url} name={item.name} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-display text-base font-medium text-white">
                              {item.name}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-zinc-500">
                              {item.author ? (
                                <span
                                  role="link"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    applyPublisher(item.author || "");
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.stopPropagation();
                                      applyPublisher(item.author || "");
                                    }
                                  }}
                                  className="underline decoration-transparent underline-offset-2 transition-colors hover:text-zinc-200 hover:decoration-white/25"
                                >
                                  {item.author}
                                </span>
                              ) : (
                                "unknown author"
                              )}
                              {item.latest_version ? ` · v${item.latest_version.version}` : ""}
                            </div>
                          </div>
                        </div>
                        <p className="mt-4 line-clamp-2 min-h-[2.75rem] text-sm leading-6 text-zinc-400">
                          {item.summary || ""}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center gap-3 pt-3 font-mono text-xs text-zinc-500 tabular">
                        <span className="inline-flex items-center gap-1.5">
                          <Download className="size-3.5" />
                          {(item.downloads || 0).toLocaleString()}
                        </span>
                        {item.license ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <FileText className="size-3.5 shrink-0" />
                              <span className="truncate">{item.license}</span>
                            </span>
                          </>
                        ) : null}
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          {session ? (
            <section id="mine" className="mt-16 scroll-mt-20 pt-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-medium tracking-tight text-white">
                    My submissions
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Packages submitted for review and currently listed under your account.
                  </p>
                </div>
                <a
                  href="/developer?new=1"
                  className="koda-btn-pill h-9 px-4 text-xs whitespace-nowrap shrink-0"
                >
                  <Plus className="size-3.5" />
                  Submit in console
                </a>
              </div>
              <div className="mt-5">
                <MyExtensions
                  items={mine}
                  loading={mineLoading}
                  error={mineError}
                  onWithdraw={withdraw}
                />
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <SiteFooter statusLine={statusLine} />

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={loginSuccess}
      />
      <DetailDialog extId={detailId} onClose={closeDetail} />
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
