import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { DeveloperMe } from "@/developer/types";

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
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="text-sm font-medium">E-mail verified</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {me.email} can publish extensions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={compact ? "gap-0 p-4 shadow-none" : "gap-0 p-5 shadow-none"}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <ShieldAlert className="size-5 text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Verify your e-mail to publish</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            New extensions and versions need a confirmed address
            {me?.email ? (
              <>
                {" "}
                for <span className="text-foreground">{me.email}</span>
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
                className="h-9 w-36 font-mono tracking-[0.3em]"
                maxLength={6}
              />
              <Button
                size="sm"
                onClick={() => void verify()}
                disabled={busy || code.length !== 6}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void send()}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Send again"}
              </Button>
            </div>
          ) : (
            <Button size="sm" className="mt-4" onClick={() => void send()} disabled={busy || !me?.email}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}
              Send code
            </Button>
          )}

          {sent ? (
            <p className="mt-3 text-xs text-muted-foreground">Code sent to {sent}.</p>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
