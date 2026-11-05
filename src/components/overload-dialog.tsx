import { useEffect, useState } from "react";
import { TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The API answers 429 with retry_after. This blocks the page until the countdown
 * ends, exactly like the old overlay, and cannot be dismissed early.
 */
export function OverloadDialog({
  open,
  seconds,
  nonce = 0,
  onDismiss,
}: {
  open: boolean;
  seconds: number;
  nonce?: number;
  onDismiss: () => void;
}) {
  const [left, setLeft] = useState(() => Math.max(1, Math.min(seconds, 600)));

  useEffect(() => {
    if (!open) return;
    let remaining = Math.max(1, Math.min(seconds, 600));
    setLeft(remaining);
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        setLeft(0);
      } else {
        setLeft(remaining);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, seconds, nonce]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="sm:max-w-sm"
      >
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
            <TimerReset className="size-5" />
          </div>
          <DialogTitle>The service is busy right now</DialogTitle>
          <DialogDescription>
            Too many requests arrived in a short time. The page unlocks when the wait is over.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-center font-mono text-4xl font-medium tabular-nums">
          {left > 0 ? `${left}s` : "Ready"}
        </div>
        <DialogFooter>
          <Button disabled={left > 0} onClick={onDismiss} className="w-full">
            {left > 0 ? `Please wait ${left} s` : "You can continue now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
