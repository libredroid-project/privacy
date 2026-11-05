import { Download, ExternalLink, Puzzle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ExtensionItem, MyExtensionItem } from "@/dashboard/types";
import { submissionTone } from "@/dashboard/types";
import { cn } from "@/lib/utils";

function ExtensionIcon({ url, name }: { url?: string; name: string }) {
  if (url) return <img src={url} alt="" className="size-10 shrink-0 rounded-lg border object-cover" />;
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-medium">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function ExtensionsView({
  all,
  mine,
  loading,
  error,
}: {
  all: ExtensionItem[];
  mine: MyExtensionItem[];
  loading: boolean;
  error: string;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Extensions</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Language packs, themes and tools that run inside the app. The store shows everything that
            passed review.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/store">
            Open the store
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">In the store</h2>
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${all.length} published`}
          </span>
        </div>

        {all.length === 0 && !loading ? (
          <p className="mt-3 rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
            Nothing published yet. The first extensions appear after review.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {all.map((item) => (
              <Card
                key={item.ext_id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  window.location.href = `/store?ext=${encodeURIComponent(item.ext_id)}`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    window.location.href = `/store?ext=${encodeURIComponent(item.ext_id)}`;
                  }
                }}
                className="group cursor-pointer gap-0 p-4 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-start gap-3">
                  <ExtensionIcon url={item.icon_url} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.author ? (
                        <a
                          href={`/store?author=${encodeURIComponent(item.author)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:text-foreground hover:underline hover:underline-offset-2"
                        >
                          {item.author}
                        </a>
                      ) : (
                        "unknown author"
                      )}
                      {item.latest_version ? ` · v${item.latest_version.version}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    <Download className="size-3" />
                    {item.downloads || 0}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.license || ""}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold">My submissions</h2>
        {mine.length === 0 ? (
          <p className="mt-3 rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
            You have not submitted anything yet. Use the store to send an extension to review.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((item) => {
              const latest = item.versions?.[0];
              return (
                <Card key={item.ext_id} className="gap-0 p-4 shadow-none">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                      <Puzzle className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{item.name}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {item.ext_id}
                        {latest ? ` · v${latest.version}` : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 font-normal", submissionTone(item.status))}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  {item.review_note ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Review note: {item.review_note}
                    </p>
                  ) : null}
                  <div className="mt-3 text-xs text-muted-foreground">
                    {item.downloads || 0} downloads
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
