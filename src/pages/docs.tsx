import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, List, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

interface DocsSection {
  id: string;
  title: string;
  group: string;
  html: string;
}

interface DocsData {
  updated: string;
  sectionCount: number;
  groups: { label: string; sections: DocsSection[] }[];
  index: { a: string; s: string; t: string; g: string; h: string; x: string }[];
  prevNext: Record<string, { prev: { id: string; title: string } | null; next: { id: string; title: string } | null }>;
}

interface SearchHit {
  a: string;
  s: string;
  t: string;
  g: string;
  h: string;
  excerpt: string;
  score: number;
}

function search(index: DocsData["index"], query: string): SearchHit[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const entry of index) {
    const heading = entry.h.toLowerCase();
    const title = entry.t.toLowerCase();
    const body = entry.x.toLowerCase();
    let score = 0;
    if (heading.startsWith(term)) score += 7;
    else if (heading.includes(term)) score += 4;
    if (title.startsWith(term)) score += 6;
    else if (title.includes(term)) score += 3;
    if (body.includes(term)) score += 1;
    if (!score) continue;
    const at = body.indexOf(term);
    const start = Math.max(0, at - 55);
    const end = Math.min(body.length, at + 85);
    hits.push({
      a: entry.a,
      s: entry.s,
      t: entry.t,
      g: entry.g,
      h: entry.h,
      excerpt: `${start > 0 ? "…" : ""}${entry.x.slice(start, end)}${end < entry.x.length ? "…" : ""}`,
      score,
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 20);
}

function Highlight({ text, term }: { text: string; term: string }) {
  const needle = term.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-brand-soft px-0.5 text-foreground">{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

function jump(anchor: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView({ behavior, block: "start" });
  history.replaceState(null, "", `#${anchor}`);
}

function DocsNav({
  data,
  active,
  onNavigate,
}: {
  data: DocsData;
  active: string;
  onNavigate?: () => void;
}) {
  const activeLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <nav aria-label="Documentation contents" className="space-y-6">
      {data.groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-2 px-3 text-[13px] font-medium text-muted-foreground">
            {group.label}
          </h3>
          <ul className="space-y-0.5">
            {group.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  ref={active === section.id ? activeLink : undefined}
                  onClick={onNavigate}
                  aria-current={active === section.id ? "location" : undefined}
                  className={cn(
                    "block border-l-2 py-1.5 pl-3 text-[13px] leading-5 transition-colors",
                    active === section.id
                      ? "border-brand font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="px-3 pt-2">
        <a href="#ai-notice" className="text-[12px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
          About these docs (AI)
        </a>
      </div>
    </nav>
  );
}

function DocsSearch({ data }: { data: DocsData }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => search(data.index, query), [data.index, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setOpen(query.trim().length >= 2);
  }, [query]);

  function go(anchor: string) {
    setQuery("");
    setOpen(false);
    jump(anchor);
  }

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        placeholder="Search the documentation"
        className="pl-9"
        aria-label="Search the documentation"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(query.trim().length >= 2)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setQuery("");
            setOpen(false);
            inputRef.current?.blur();
          }
          if (event.key === "Enter" && hits[0]) go(hits[0].a);
        }}
      />
      <div className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 gap-1 sm:flex">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
      </div>

      {open ? (
        <div
          className="absolute top-full right-0 left-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-lg border bg-popover shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          {hits.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nothing found. Try a shorter word.</p>
          ) : (
            <ul className="divide-y">
              {hits.map((hit) => (
                <li key={hit.a}>
                  <button
                    type="button"
                    onClick={() => go(hit.a)}
                    className="block w-full px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-baseline gap-2 text-[11px] text-muted-foreground">
                      <span>{hit.g}</span>
                      <span>·</span>
                      <span className="text-foreground">{hit.t}</span>
                    </div>
                    <div className="mt-0.5 text-sm font-medium">
                      <Highlight text={hit.h} term={query} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      <Highlight text={hit.excerpt} term={query} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LoadingState(): ReactNode {
  return (
    <div className="space-y-4 py-10">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function DocsPage() {
  const [data, setData] = useState<DocsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/generated/docs.json")
      .then((module) => {
        if (!cancelled) setData(module.default as unknown as DocsData);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(
    () => data?.groups.flatMap((group) => group.sections) ?? [],
    [data],
  );

  useEffect(() => {
    if (!data) return;
    const ids = sections.map((section) => section.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0] || "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) {
      window.setTimeout(() => jump(hash, "auto"), 80);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [data, sections]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="py-10 pt-28">
          <h1 className="max-w-3xl text-3xl font-medium tracking-[-0.035em] sm:text-4xl lg:text-5xl">
            Everything, written down.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Running KodaHosting, extending it and making it your own. Parts of it were written with AI
            assistance, see{" "}
            <a href="#ai-notice" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-brand">
              the notice at the end
            </a>
            .
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {data ? <DocsSearch data={data} /> : <div className="h-9 w-full max-w-md rounded-md bg-muted" />}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {data?.sectionCount ?? "—"} sections · Last updated {data?.updated ?? "—"}
              </span>
              <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <List className="size-4" />
                    Contents
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] overflow-y-auto">
                  <SheetTitle className="mb-4">Contents</SheetTitle>
                  {data ? <DocsNav data={data} active={active} onNavigate={() => setMobileNav(false)} /> : null}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="grid gap-12 py-10 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4 pb-8">
              {data ? <DocsNav data={data} active={active} /> : null}
            </div>
          </aside>

          <main className="min-w-0 max-w-3xl">
            {failed ? (
              <p className="text-sm text-destructive">The documentation could not be loaded.</p>
            ) : !data ? (
              <LoadingState />
            ) : (
              <>
                {sections.map((section, index) => {
                  const nav = data.prevNext[section.id];
                  return (
                    <section
                      key={section.id}
                      id={section.id}
                      className={cn("scroll-mt-24", index > 0 && "mt-16", index > 0 ? "pt-16" : "")}
                    >
                      <h2 className="text-2xl font-medium tracking-tight">{section.title}</h2>
                      {/* Trusted HTML authored in tools/docsgen/content_*.py. */}
                      <div className="docs-prose mt-4" dangerouslySetInnerHTML={{ __html: section.html }} />

                      {nav && (nav.prev || nav.next) ? (
                        <div className="mt-8 grid gap-3 border-t pt-6 sm:grid-cols-2">
                          {nav.prev ? (
                            <a
                              href={`#${nav.prev.id}`}
                              className="group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                            >
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ArrowLeft className="size-3.5" /> Previous
                              </span>
                              <span className="text-sm font-medium group-hover:underline group-hover:underline-offset-4">
                                {nav.prev.title}
                              </span>
                            </a>
                          ) : (
                            <span />
                          )}
                          {nav.next ? (
                            <a
                              href={`#${nav.next.id}`}
                              className="group flex flex-col items-end gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-muted/50"
                            >
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                Next <ArrowRight className="size-3.5" />
                              </span>
                              <span className="text-sm font-medium group-hover:underline group-hover:underline-offset-4">
                                {nav.next.title}
                              </span>
                            </a>
                          ) : (
                            <span />
                          )}
                        </div>
                      ) : null}
                    </section>
                  );
                })}

                <section id="ai-notice" className="mt-14 scroll-mt-24 rounded-lg border bg-muted/40 p-6">
                  <Badge variant="outline" className="mb-3 font-mono text-[10px]">AI</Badge>
                  <p className="text-sm leading-6 text-muted-foreground">
                    <strong className="font-semibold text-foreground">About these docs.</strong> Large parts of
                    this documentation were drafted with the assistance of an AI language model
                    (deepseek-flash-v4.1) and reviewed by the developer. The AI was used for the wording, the
                    structure and the examples only. The KodaHosting Android application itself, its server
                    hosting logic, the networking infrastructure and all executable code are written entirely by
                    the developer and are not AI-generated; where this documentation describes code, the code is
                    the source of truth. Legal responsibility for all content, including the AI-assisted
                    sections, rests with the developer and their legal guardians, as set out in the Impressum.
                  </p>
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
