import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toaster } from "@/components/ui/sonner";
import { OverloadDialog } from "@/components/overload-dialog";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { api, publicApi, setRateLimitHandler } from "@/lib/api";
import { plural } from "@/lib/format";
import { DetailDialog } from "@/store/detail-dialog";
import { LoginDialog } from "@/store/login-dialog";
import { MyExtensions } from "@/store/my-extensions";
import { SubmitDialog } from "@/store/submit-dialog";
import { useSession } from "@/store/use-session";
import type { CatalogItem, MyExtension, StoreStatus } from "@/store/types";
import { CATEGORIES } from "@/store/types";
import { cn } from "@/lib/utils";

function StoreIcon({ url, name }: { url?: string; name: string }) {
  if (url) {
    return <img src={url} alt="" className="size-11 shrink-0 rounded-lg object-cover" />;
  }
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium">
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
  const [submitOpen, setSubmitOpen] = useState(false);
  const [afterLogin, setAfterLogin] = useState<"submit" | "mine" | null>(null);

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
    if (!session) setSubmitOpen(false);
  }, [session]);

  useEffect(() => {
    document.title = publisher
      ? `${publisher} | KodaHosting Extension Store`
      : "KodaHosting | Extension Store";
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

  function requestSubmit() {
    if (session) {
      setSubmitOpen(true);
      return;
    }
    setAfterLogin("submit");
    setLoginOpen(true);
  }

  function loginSuccess() {
    const intent = afterLogin;
    setAfterLogin(null);
    if (intent === "submit") setSubmitOpen(true);
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
    ? `API online · ${status.servers?.total ?? 0} servers, ${status.servers?.players_online ?? 0} players · ${plural(status.extensions?.published ?? 0, "extension")}`
    : statusError
      ? "API status unavailable"
      : null;

  return (
    <div className="flex min-h-screen flex-col">
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
        <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-12 sm:px-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-4xl font-medium tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                {publisher ? "Publisher" : "Extension Store"}
              </h1>
              {publisher ? null : (
                <p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Language packs, themes, tools and interface add-ons for the Minecraft server on
                  your phone. Every version is checked by hand.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReloadNonce((value) => value + 1)}
                disabled={loading}
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button size="sm" onClick={requestSubmit}>
                <Plus className="size-4" />
                Submit extension
              </Button>
            </div>
          </div>

          {publisher ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="text-sm">
                <span className="font-medium">{publisher}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {publisherCount} {publisherCount === 1 ? "published extension" : "published extensions"} in the store
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

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, summary or author"
                className="pl-9"
                aria-label="Search extensions"
              />
            </div>
            <ToggleGroup
              type="single"
              value={category}
              onValueChange={(value) => value && setCategory(value)}
              className="flex flex-wrap justify-start gap-1.5"
            >
              {CATEGORIES.map(([value, label]) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  size="sm"
                  className="rounded-full border px-3 text-sm font-normal data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {loading ? "Loading the store…" : `${visible.length} ${visible.length === 1 ? "extension" : "extensions"}`}
          </div>

          <div className="mt-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>The store could not be loaded</AlertTitle>
                <AlertDescription className="flex items-center gap-3">
                  {error}
                  <Button size="sm" variant="outline" onClick={() => setReloadNonce((value) => value + 1)}>
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="gap-0 p-5">
                    <div className="flex gap-3">
                      <Skeleton className="size-11 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="mt-4 h-3 w-full" />
                    <Skeleton className="mt-2 h-3 w-4/5" />
                  </Card>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="rounded-xl bg-card p-12 text-center text-base text-muted-foreground">
                {emptyText}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item, index) => (
                  <Reveal key={item.ext_id} delay={Math.min(index * 40, 240)} className="h-full">
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(item.ext_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail(item.ext_id);
                      }
                    }}
                    className="group h-full cursor-pointer gap-0 p-5 transition-colors hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <div className="flex items-start gap-3">
                      <StoreIcon url={item.icon_url} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-medium group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
                          {item.name}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          {item.author ? (
                            <a
                              href={`/store?author=${encodeURIComponent(item.author)}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                applyPublisher(item.author || "");
                              }}
                              className="underline decoration-transparent underline-offset-2 transition-colors hover:text-foreground hover:decoration-border"
                            >
                              {item.author}
                            </a>
                          ) : (
                            "unknown author"
                          )}
                          {item.latest_version ? ` · v${item.latest_version.version}` : ""}
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-2 min-h-12 text-base leading-6 text-muted-foreground">
                      {item.summary || ""}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Download className="size-3.5" />
                        {item.downloads || 0}
                      </span>
                      {item.license ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <FileText className="size-3.5 shrink-0" />
                          <span className="truncate">{item.license}</span>
                        </span>
                      ) : null}
                    </div>
                  </Card>
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          {session ? (
            <section id="mine" className="mt-16 scroll-mt-20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">My submissions</h2>
                  <p className="mt-1 text-base text-muted-foreground">
                    What you sent to review, and what the store shows.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={requestSubmit}>
                  <Plus className="size-4" />
                  Submit
                </Button>
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
      <SubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        mineItems={mine}
        onSubmitted={refreshMine}
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
