import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/error-state";
import { LicenseAccordion, type LicenseEntry } from "@/components/license-accordion";

export function LicensesView() {
  const [entries, setEntries] = useState<LicenseEntry[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
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
  }, [retryNonce]);

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
        <h1 className="font-display text-2xl font-medium tracking-tight text-white">Licenses</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Every third-party licence that ships with the app, the server engines, the tunnel and the
          site.
        </p>
        <div className="relative mt-5 max-w-sm">
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
          <p className="mt-2.5 font-mono text-xs text-zinc-500 tabular">
            {`${visible.length} of ${entries.length} entries`}
          </p>
        ) : null}
      </div>

      {error ? (
        <ErrorState
          code="MANIFEST ERROR"
          title="The licence list could not be loaded"
          description="We could not fetch the third-party licence manifest."
          detail={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
        />
      ) : (
        <LicenseAccordion entries={visible} />
      )}
    </div>
  );
}
