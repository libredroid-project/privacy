import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LicenseAccordion, type LicenseEntry } from "@/components/license-accordion";

export function LicensesView() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Licenses</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every third-party licence that ships with the app, the server engines, the tunnel and the
          site.
        </p>
        <div className="relative mt-5 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter the list"
            className="pl-9"
            aria-label="Filter the licence list"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {error ? `The licence list could not be loaded: ${error}` : `${visible.length} of ${entries.length} entries`}
        </p>
      </div>

      <LicenseAccordion entries={visible} />
    </div>
  );
}
