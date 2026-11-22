import { Download, ExternalLink, Puzzle } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import type { ExtensionItem, MyExtensionItem, SubmissionStatus } from "@/dashboard/types";
import { safeImageUrl } from "@/lib/security";
import { cn } from "@/lib/utils";

function ExtensionIcon({ url, name }: { url?: string; name: string }) {
  const safeUrl = safeImageUrl(url);
  if (safeUrl) {
    return (
      <img
        src={safeUrl}
        alt=""
        className="size-10 shrink-0 rounded-xl bg-white/[0.05] object-cover ring-1 ring-white/[0.08]"
      />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] font-display text-sm font-medium text-white ring-1 ring-white/[0.08]">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function statusDot(status: SubmissionStatus): { dot: string; text: string } {
  switch (status) {
    case "APPROVED":
      return { dot: "bg-emerald-400", text: "text-emerald-400" };
    case "PENDING":
      return { dot: "bg-amber-400", text: "text-amber-300" };
    case "REJECTED":
    case "DELISTED":
      return { dot: "bg-red-400", text: "text-red-400" };
    default:
      return { dot: "bg-zinc-500", text: "text-zinc-400" };
  }
}

export function ExtensionsView({
  all,
  mine,
  loading,
  error,
  onRetry,
}: {
  all: ExtensionItem[];
  mine: MyExtensionItem[];
  loading: boolean;
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">
            Extensions
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Language packs, themes, and tools that run inside the app. The store lists every package that passed review.
          </p>
        </div>
        <a href="/store" className="koda-btn-pill h-9 px-4 text-xs">
          Open store
          <ExternalLink className="size-3.5 opacity-75" />
        </a>
      </div>

      {error ? (
        <ErrorState
          compact
          title="Could not load extensions"
          description="We could not reach the KodaHosting store API."
          detail={error}
          onRetry={onRetry}
        />
      ) : null}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-medium text-white">In the store</h2>
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {loading ? "Loading..." : `${all.length} published`}
          </span>
        </div>

        {all.length === 0 && !loading ? (
          <div className="resend-glass-panel mt-3 rounded-2xl p-10 text-center text-sm text-zinc-400">
            Nothing published yet. The first extensions appear after review.
          </div>
        ) : (
          <div className="mt-3 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {all.map((item) => (
              <div
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
                className="resend-glass-panel group cursor-pointer rounded-2xl p-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-3">
                  <ExtensionIcon url={item.icon_url} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-sm font-medium text-white">
                      {item.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-400">
                      {item.author ? (
                        <a
                          href={`/store?author=${encodeURIComponent(item.author)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:text-white hover:underline hover:underline-offset-2"
                        >
                          {item.author}
                        </a>
                      ) : (
                        "unknown author"
                      )}
                      {item.latest_version ? ` · v${item.latest_version.version}` : ""}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-zinc-400">
                    <Download className="size-3 text-zinc-500" />
                    {(item.downloads || 0).toLocaleString()}
                  </span>
                </div>
                {item.license ? (
                  <p className="mt-3 truncate font-mono text-[11px] text-zinc-500">{item.license}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-medium text-white">My submissions</h2>
          <a
            href="/developer"
            className="text-xs text-zinc-400 transition-colors hover:text-white"
          >
            Open Developer Console
          </a>
        </div>

        {mine.length === 0 ? (
          <div className="resend-glass-panel mt-3 rounded-2xl p-10 text-center text-sm text-zinc-400">
            You have not submitted anything yet. Publish extensions for review in the{" "}
            <a
              href="/developer?new=1"
              className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-brand"
            >
              Developer Console
            </a>
            .
          </div>
        ) : (
          <div className="mt-3 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((item) => {
              const latest = item.versions?.[0];
              const tone = statusDot(item.status);
              return (
                <a
                  key={item.ext_id}
                  href={`/developer/extensions/${encodeURIComponent(item.ext_id)}/listing`}
                  className="resend-glass-panel block rounded-2xl p-4 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
                      <Puzzle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-medium text-white">
                        {item.name}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                        {item.ext_id}
                        {latest ? ` · v${latest.version}` : ""}
                      </div>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px]", tone.text)}>
                      <span className={cn("size-1.5 rounded-full", tone.dot)} />
                      {item.status}
                    </span>
                  </div>
                  {item.review_note ? (
                    <p className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-xs leading-5 text-zinc-400">
                      Review note: {item.review_note}
                    </p>
                  ) : null}
                  <div className="mt-3 font-mono text-xs tabular-nums text-zinc-500">
                    {(item.downloads || 0).toLocaleString()} downloads
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
