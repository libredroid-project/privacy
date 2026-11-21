import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimatedSidebarNav } from "@/components/animated-sidebar-nav";
import { ErrorState } from "@/components/error-state";
import { LicenseAccordion, type LicenseEntry } from "@/components/license-accordion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/tos", label: "Terms of Service" },
  { href: "/impressum", label: "Impressum" },
  { href: "/licenses", label: "Licenses" },
];

export function LicensesPage() {
  const [entries, setEntries] = useState<LicenseEntry[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/licenses/manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: LicenseEntry[]) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      entries.filter(
        (entry) =>
          !term ||
          entry.title.toLowerCase().includes(term) ||
          entry.file.toLowerCase().includes(term),
      ),
    [entries, term],
  );

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="hidden lg:block lg:border-r lg:border-white/[0.06] lg:pr-6">
              <div className="sticky top-24">
                <div className="mb-1.5 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase">
                  Legal documents
                </div>
                <nav aria-label="Legal documents">
                  <AnimatedSidebarNav
                    activeId="/licenses"
                    items={LEGAL_NAV.map((item) => ({
                      id: item.href,
                      label: item.label,
                      href: item.href,
                    }))}
                  />
                </nav>
              </div>
            </aside>

            <div className="min-w-0 max-w-3xl">
              <div className="pb-8">
                <p className="font-mono text-xs text-brand-ink">Third-party attributions</p>
                <h1 className="resend-title mt-2 font-display text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
                  Licenses
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Every third-party licence that ships with the app, the server engines, the tunnel
                  and the site. Texts are shown in full; PDFs open in a new tab.
                </p>
                <div className="relative mt-6 max-w-sm">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Filter the list"
                    className="h-10 rounded-full border-0 bg-white/[0.06] pl-10 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
                    aria-label="Filter the licence list"
                  />
                </div>
                {!error ? (
                  <div className="mt-3 font-mono text-xs text-zinc-500 tabular">
                    {`${visible.length} of ${entries.length} entries`}
                  </div>
                ) : null}
              </div>

              <div className="mt-2">
                {error ? (
                  <ErrorState
                    code="MANIFEST ERROR"
                    title="The licence list could not be loaded"
                    description="Check your connection and reload to fetch the third-party attribution manifest."
                    detail={error}
                    onRetry={() => window.location.reload()}
                  />
                ) : (
                  <LicenseAccordion entries={visible} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
