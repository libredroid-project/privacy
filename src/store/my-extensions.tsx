import { useState } from "react";
import { Loader2, Puzzle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { relativeDate } from "@/lib/format";
import type { MyExtension } from "@/store/types";
import { isEnded, statusBadgeClass } from "@/store/types";

export function MyExtensions({
  items,
  loading,
  error,
  onWithdraw,
}: {
  items: MyExtension[];
  loading: boolean;
  error: string;
  onWithdraw: (extId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<MyExtension | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmWithdraw() {
    if (!pending) return;
    setBusy(true);
    try {
      await onWithdraw(pending.ext_id);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your submissions…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">Could not load your extensions: {error}</p>;
  }
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        You have not submitted anything yet. Use “Submit extension” above.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const latest = item.versions?.[0];
          const ended = isEnded(item.status);
          return (
            <Reveal key={item.ext_id} delay={Math.min(index * 50, 250)} className="h-full">
            <Card className="h-full gap-0 p-5 shadow-none">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  <Puzzle className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {item.ext_id}
                    {latest ? ` · v${latest.version}` : ""}
                  </div>
                </div>
                <Badge variant="outline" className={`font-normal ${statusBadgeClass(item.status)}`}>
                  {item.status}
                </Badge>
              </div>

              {item.review_note ? (
                <p className={`mt-3 text-sm ${ended ? "text-destructive" : "text-muted-foreground"}`}>
                  {ended ? "Reason: " : "Review note: "}
                  {item.review_note}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{item.downloads || 0} downloads</span>
                {item.published_at ? <span>published {relativeDate(item.published_at)}</span> : null}
                {item.ended_at ? <span>ended {relativeDate(item.ended_at)}</span> : null}
              </div>

              <div className="mt-4">
                {item.status !== "WITHDRAWN" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPending(item)}
                    aria-label={`Withdraw ${item.name}`}
                  >
                    Withdraw
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Withdrawn - submit a new version to bring it back into review.
                  </p>
                )}
              </div>
            </Card>
            </Reveal>
          );
        })}
      </div>

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => (open ? null : setPending(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw “{pending?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The extension disappears from the store. Submitting a new version puts it back into
              review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmWithdraw();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
