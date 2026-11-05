import { useState } from "react";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LicenseEntry {
  file: string;
  title: string;
  type: string;
}

const MAX_PREVIEW = 60_000;

/**
 * Lazy list: a licence text is fetched the first time its row opens. The row
 * itself owns the height, so text that arrives after the open still fits.
 */
export function LicenseAccordion({ entries }: { entries: LicenseEntry[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function load(file: string) {
    if (bodies[file] !== undefined || loading[file]) return;
    setLoading((current) => ({ ...current, [file]: true }));
    try {
      const response = await fetch(`/licenses/${encodeURIComponent(file)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setBodies((current) => ({ ...current, [file]: text.slice(0, MAX_PREVIEW) }));
    } catch (err) {
      setBodies((current) => ({
        ...current,
        [file]: `Could not load this file: ${(err as Error).message}`,
      }));
    } finally {
      setLoading((current) => ({ ...current, [file]: false }));
    }
  }

  function toggle(entry: LicenseEntry) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(entry.file)) {
        next.delete(entry.file);
      } else {
        next.add(entry.file);
        if (entry.type !== "pdf") void load(entry.file);
      }
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isOpen = open.has(entry.file);
        return (
          <div key={entry.file} className="rounded-xl bg-card">
            <button
              type="button"
              onClick={() => toggle(entry)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-base font-medium"
            >
              <span>{entry.title}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4">
                  {entry.type === "pdf" ? (
                    <a
                      href={`/licenses/${encodeURIComponent(entry.file)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-brand"
                    >
                      <ExternalLink className="size-4" />
                      Open PDF
                    </a>
                  ) : loading[entry.file] && bodies[entry.file] === undefined ? (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Loading…
                    </span>
                  ) : (
                    <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-[13px] leading-5 whitespace-pre-wrap text-muted-foreground">
                      {bodies[entry.file] ?? "Open the entry to load the text."}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
