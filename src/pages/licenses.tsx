import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LicenseAccordion, type LicenseEntry } from "@/components/license-accordion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 pt-28 pb-12 sm:px-6">
          <div className="pb-8">
            <h1 className="text-3xl font-medium tracking-[-0.035em] sm:text-4xl">Licenses</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every third-party licence that ships with the app, the server engines, the tunnel and the
              site. Texts are shown in full; PDFs open in a new tab.
            </p>
            <div className="relative mt-6 max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter the list"
                className="pl-9"
                aria-label="Filter the licence list"
              />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {error
                ? `The licence list could not be loaded: ${error}`
                : `${visible.length} of ${entries.length} entries`}
            </div>
          </div>

          <div className="mt-4">
            <LicenseAccordion entries={visible} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
