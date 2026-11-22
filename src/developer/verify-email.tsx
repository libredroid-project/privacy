import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { DeveloperMe } from "@/developer/types";
import { cn } from "@/lib/utils";

const CODE_ERRORS: Record<string, string> = {
  wrong_code: "That code is not right. Check the mail and try again.",
  expired: "The code expired. Send a new one.",
  no_code: "No open code for this address. Send a new one.",
  too_many_tries: "Too many tries for this code. Send a new one.",
  slow_down: "A few codes went out already. Wait a minute before the next one.",
  mail_send_fail: "The mail could not be sent. Try again in a moment.",
  invalid_code: "Enter the six digit code from the mail.",
  no_email: "This account has no e-mail address.",
};

export function VerifyEmail({
  me,
  onVerified,
  compact,
}: {
  me: DeveloperMe | null;
  onVerified: () => void;
  compact?: boolean;
}) {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ already_verified?: boolean }>("/v1/me/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.already_verified) {
        onVerified();
        return;
      }
      setStep("code");
      setSent(me?.email || "");
      setCooldown(60);
    } catch (err) {
      setError(CODE_ERRORS[(err as Error).message] || (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      await api("/v1/me/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      onVerified();
    } catch (err) {
      setError(CODE_ERRORS[(err as Error).message] || (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (me?.email_verified) {
    return (
      <div className="resend-glass-panel flex items-start gap-3 rounded-2xl p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            E-mail verified
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
            {me.email} is cleared to publish extensions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("resend-glass-panel rounded-2xl", compact ? "p-4" : "p-5")}>
      <div className="flex items-start gap-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Verify your e-mail to publish
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            New extensions and releases require a confirmed address
            {me?.email ? (
              <>
                {" "}
                for <span className="font-mono text-xs text-zinc-950 dark:text-white">{me.email}</span>
              </>
            ) : null}
            . The code arrives from no-reply@kodaserv.eu.
          </p>

          {step === "code" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                aria-label="Verification code"
                className="h-9 w-36 rounded-xl border-zinc-200 bg-white font-mono tracking-[0.3em] dark:border-white/[0.09] dark:bg-white/[0.04]"
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => void verify()}
                disabled={busy || code.length !== 6}
                className="koda-btn-black h-9 px-4 text-xs disabled:opacity-45"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Verify
              </button>
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || cooldown > 0}
                className="koda-btn-pill h-9 px-3.5 text-xs disabled:opacity-45"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Send again"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !me?.email}
              className="koda-btn-black mt-4 h-9 px-4 text-xs disabled:opacity-45"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MailCheck className="size-3.5" />}
              Send code
            </button>
          )}

          {sent ? (
            <p className="mt-3 font-mono text-xs text-zinc-500">Code sent to {sent}.</p>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mt-3 rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </div>
  );
}
