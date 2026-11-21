import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "idle"; text: "" }
  | { kind: "busy"; text: "" }
  | { kind: "err" | "ok"; text: string };

export function ResetPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSession) return;
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [hasSession]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setStatus({ kind: "err", text: "The password needs at least 8 characters." });
      return;
    }
    if (password !== repeat) {
      setStatus({ kind: "err", text: "The two passwords do not match." });
      return;
    }
    setStatus({ kind: "busy", text: "" });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus({ kind: "err", text: `Could not save the password: ${error.message}` });
      return;
    }
    setPassword("");
    setRepeat("");
    setStatus({ kind: "idle", text: "" });
    setDone(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pt-28 pb-16 sm:px-6">
        <div
          aria-hidden="true"
          className="resend-dot-grid pointer-events-none absolute inset-0 opacity-60"
        />

        <div className="relative w-full max-w-md">
          {!ready ? (
            <div className="resend-glass-panel flex items-center justify-center gap-2.5 rounded-3xl p-10 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin text-brand-ink" />
              Checking reset link…
            </div>
          ) : done ? (
            <div className="resend-glass-panel rounded-3xl p-7 sm:p-8">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <h1 className="mt-4 font-display text-xl font-medium tracking-[-0.025em] text-white">
                Password updated
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Your new password is active. You can sign in to the dashboard and the Android app
                with it right away.
              </p>
              <a href="/dashboard" className="koda-btn-black mt-6 h-10 w-full px-5 text-sm">
                Open dashboard
              </a>
            </div>
          ) : !hasSession ? (
            <ErrorState
              code="RESET LINK EXPIRED"
              title="No valid reset link"
              description="Open this page through the recovery link sent to your email. If the link expired, request a new one inside the KodaHosting app under Settings, Account, Password forgotten."
              secondaryAction={
                <a href="/dashboard" className="koda-btn-black h-9 px-4 text-xs">
                  <ArrowLeft className="size-3.5 text-brand-ink" />
                  Sign in to dashboard
                </a>
              }
            />
          ) : (
            <div className="resend-glass-panel rounded-3xl p-7 sm:p-8">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-brand-ink">
                <KeyRound className="size-4" />
              </div>
              <h1 className="mt-4 font-display text-xl font-medium tracking-[-0.025em] text-white">
                Set a new password
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                Enter your new KodaHosting account password below.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-zinc-300">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-black/80 text-white placeholder:text-zinc-600 focus-visible:border-white/25"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="repeat-password" className="text-zinc-300">
                    Repeat password
                  </Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Repeat password"
                    value={repeat}
                    onChange={(event) => setRepeat(event.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-black/80 text-white placeholder:text-zinc-600 focus-visible:border-white/25"
                    required
                  />
                </div>

                {status.kind === "err" ? (
                  <ErrorState compact title="Could not update password" detail={status.text} />
                ) : null}

                <button
                  type="submit"
                  className="koda-btn-black h-11 w-full text-sm disabled:opacity-50"
                  disabled={status.kind === "busy"}
                >
                  {status.kind === "busy" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save password
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
