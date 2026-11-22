import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AnimatedSidebarNav } from "@/components/animated-sidebar-nav";
import { ErrorState } from "@/components/error-state";
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
  prevNext: Record<
    string,
    { prev: { id: string; title: string } | null; next: { id: string; title: string } | null }
  >;
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
      <mark className="rounded bg-brand-soft px-0.5 text-foreground">
        {text.slice(at, at + needle.length)}
      </mark>
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
  return (
    <nav aria-label="Documentation contents" className="space-y-6">
      {data.groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-1.5 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase">
            {group.label}
          </h3>
          <AnimatedSidebarNav
            activeId={group.sections.some((section) => section.id === active) ? active : null}
            scrollActiveIntoView
            items={group.sections.map((section) => ({
              id: section.id,
              label: section.title,
              href: `#${section.id}`,
              onClick: onNavigate,
            }))}
          />
        </div>
      ))}
      <div className="px-3 pt-2">
        <a
          href="#ai-notice"
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-200"
        >
          About these docs
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
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
      <Input
        ref={inputRef}
        value={query}
        placeholder="Search the documentation"
        className="h-10 rounded-full border-0 bg-white/[0.06] pl-10 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
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
      <div className="pointer-events-none absolute top-1/2 right-3.5 hidden -translate-y-1/2 gap-1 sm:flex">
        <kbd className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
          ⌘K
        </kbd>
      </div>

      {open ? (
        <div
          className="absolute top-full right-0 left-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl bg-[#0d0d10] p-1.5 shadow-2xl"
          onMouseDown={(event) => event.preventDefault()}
        >
          {hits.length === 0 ? (
            <p className="p-4 text-sm text-zinc-400">Nothing found. Try a shorter word.</p>
          ) : (
            <ul className="space-y-0.5">
              {hits.map((hit) => (
                <li key={hit.a}>
                  <button
                    type="button"
                    onClick={() => go(hit.a)}
                    className="block w-full rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="flex items-baseline gap-2 font-mono text-[11px] text-zinc-500">
                      <span>{hit.g}</span>
                      <span>·</span>
                      <span className="text-zinc-300">{hit.t}</span>
                    </div>
                    <div className="mt-0.5 font-display text-sm font-medium text-white">
                      <Highlight text={hit.h} term={query} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-400">
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
          <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-white/[0.06]" />
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
    <div className="min-h-screen bg-black text-zinc-100">
      <SiteHeader active="docs" />

      <div className="page-reveal mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="pt-28 pb-10">
          <p className="font-mono text-xs text-brand-ink">Technical reference</p>
          <h1 className="resend-title mt-2 max-w-3xl font-display text-3xl font-medium tracking-[-0.035em] sm:text-4xl lg:text-5xl">
            Everything, written down.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-400">
            Running KodaHosting, configuring tunnels, extending the app, and publishing to the
            store. See{" "}
            <a
              href="#ai-notice"
              className="font-medium text-zinc-200 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
            >
              the authorship notice at the end
            </a>
            .
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {data ? (
              <DocsSearch data={data} />
            ) : (
              <div className="h-10 w-full max-w-md rounded-full bg-white/[0.06]" />
            )}
            <div className="flex items-center gap-3 font-mono text-xs text-zinc-500 tabular">
              <span>
                {data?.sectionCount ?? "..."} sections · Updated {data?.updated ?? "..."}
              </span>
              <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="koda-btn-pill h-9 px-3.5 text-xs lg:hidden"
                  >
                    <List className="size-3.5" />
                    Contents
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto border-0 bg-[#050507] p-5">
                  <SheetTitle className="mb-5 font-display text-sm font-medium text-white">
                    Documentation
                  </SheetTitle>
                  {data ? (
                    <DocsNav data={data} active={active} onNavigate={() => setMobileNav(false)} />
                  ) : null}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="grid gap-12 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block lg:border-r lg:border-white/[0.06] lg:pr-6">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">
              {data ? <DocsNav data={data} active={active} /> : null}
            </div>
          </aside>

          <main className="min-w-0 max-w-3xl">
            {failed ? (
              <ErrorState
                code="DOCS UNAVAILABLE"
                title="The documentation could not be loaded"
                description="Reload the page to fetch the documentation bundle again."
                onRetry={() => window.location.reload()}
              />
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
                      className={cn("scroll-mt-24", index > 0 && "mt-16 pt-10")}
                    >
                      <h2 className="font-display text-2xl font-medium tracking-[-0.025em] text-white">
                        {section.title}
                      </h2>
                      {/* Trusted HTML authored in tools/docsgen/content_*.py. */}
                      <div
                        className="docs-prose mt-4"
                        dangerouslySetInnerHTML={{ __html: section.html }}
                      />

                      {nav && (nav.prev || nav.next) ? (
                        <div className="mt-10 grid gap-3 sm:grid-cols-2">
                          {nav.prev ? (
                            <a
                              href={`#${nav.prev.id}`}
                              className="group flex flex-col gap-1 rounded-2xl bg-[#09090b] p-4 transition-colors hover:bg-white/[0.06]"
                            >
                              <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                                <ArrowLeft className="size-3.5" /> Previous
                              </span>
                              <span className="font-display text-sm font-medium text-zinc-200 transition-colors group-hover:text-white">
                                {nav.prev.title}
                              </span>
                            </a>
                          ) : (
                            <span />
                          )}
                          {nav.next ? (
                            <a
                              href={`#${nav.next.id}`}
                              className="group flex flex-col items-end gap-1 rounded-2xl bg-[#09090b] p-4 text-right transition-colors hover:bg-white/[0.06]"
                            >
                              <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                                Next <ArrowRight className="size-3.5" />
                              </span>
                              <span className="font-display text-sm font-medium text-zinc-200 transition-colors group-hover:text-white">
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

                <section
                  id="ai-notice"
                  className="mt-16 scroll-mt-24 rounded-2xl bg-[#09090b] p-6"
                >
                  <p className="font-mono text-xs text-zinc-500">Authorship notice</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    <strong className="font-semibold text-zinc-100">About these docs.</strong>{" "}
                    Large parts of this documentation were drafted with the assistance of an AI
                    language model (deepseek-flash-v4.1) and reviewed by the developer. The AI was
                    used for the wording, the structure and the examples only. The KodaHosting
                    Android application itself, its server hosting logic, the networking
                    infrastructure and all executable code are written entirely by the developer and
                    are not AI-generated; where this documentation describes code, the code is the
                    source of truth. Legal responsibility for all content, including the AI-assisted
                    sections, rests with the developer and their legal guardians, as set out in the
                    Impressum.
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
