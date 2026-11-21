import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/error-state";
import { GoogleButton } from "@/components/google-button";
import { supabase } from "@/lib/supabase";

interface Props {
  intent?: "dashboard" | "developer";
}

export function LoginView({ intent = "dashboard" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDev = intent === "developer";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authErr) throw authErr;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(credential: string) {
    setError(null);
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
      });
      if (authErr) throw authErr;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dark relative flex min-h-svh flex-col justify-between overflow-hidden bg-black text-zinc-100">
      {/* Preserved original KodaHosting sign-in artwork */}
      <img
        src="/assets/app/login-bg.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full scale-[1.01] object-cover object-center opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_70%_45%,rgba(0,0,0,0.32),rgba(0,0,0,0.82)_76%),linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.42)_45%,rgba(0,0,0,0.92))]"
      />

      {/* Minimal top bar */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <a
          href="/"
          className="inline-flex items-center gap-2.5 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <img
            src="/assets/logo.png"
            alt=""
            aria-hidden="true"
            className="size-7 rounded-lg object-cover ring-1 ring-white/15"
          />
          <span className="font-sans text-[17px] font-semibold tracking-[-0.025em]">
            Koda<span className="text-brand-ink">Hosting</span>
          </span>
        </a>
        <a
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-4 text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0 backdrop-blur-md transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="size-3.5" />
          Back to website
        </a>
      </div>

      {/* Main split sign-in */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6">
        <div className="grid w-full items-center gap-12 lg:grid-cols-12">
          <div className="hidden lg:col-span-6 lg:block">
            <p className="text-sm font-medium text-brand-ink">
              {isDev ? "KodaHosting Developer Console" : "KodaHosting Web Dashboard"}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[1.04] font-normal tracking-[-0.03em] text-white sm:text-[3.5rem]">
              {isDev ? "Build & ship .kodaext extensions." : "Control your pocket servers."}
            </h1>
            <p className="mt-5 max-w-md text-[15.5px] leading-7 text-zinc-300">
              {isDev
                ? "Edit source files in the browser CodeMirror IDE, run preflight checks, and submit releases directly to the Extension Store."
                : "Follow the live console, browse and edit local world files, manage extensions, and configure KodaDash MCP from any desktop browser."}
            </p>
            <p className="mt-8 border-t border-white/15 pt-5 text-xs text-zinc-400">
              Sign in with the same account created inside the KodaHosting Android app.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="mx-auto w-full max-w-md rounded-3xl border border-white/[0.13] bg-[#070709]/88 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
                  <LogIn className="size-4 text-brand-ink" />
                </div>
                <h2 className="font-display text-2xl font-normal tracking-[-0.02em] text-white">
                  Sign in
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                  {isDev
                    ? "Sign in with your KodaHosting account to access the Developer Console."
                    : "Sign in to view your servers, devices, and support tickets."}
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dash-email" className="text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="dash-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    className="h-11 rounded-xl border-white/12 bg-black/75 text-white focus-visible:border-brand-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dash-password" className="text-zinc-300">
                    Password
                  </Label>
                  <Input
                    id="dash-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className="h-11 rounded-xl border-white/12 bg-black/75 text-white focus-visible:border-brand-ink"
                  />
                </div>

                {error ? (
                  <ErrorState compact title="Sign-in failed" detail={error} />
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="koda-btn-black h-11 w-full text-sm disabled:opacity-50"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Sign in with email
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-zinc-500">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <GoogleButton onCredential={handleGoogle} />

              <p className="mt-5 text-center text-xs leading-5 text-zinc-400">
                No account yet? Create one inside the KodaHosting app under{" "}
                <span className="font-medium text-zinc-200">Settings → Account</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 text-xs text-zinc-400 sm:px-6">
        <span>© {new Date().getFullYear()} KodaHosting</span>
        <span>DE Infrastructure · GDPR</span>
      </div>
    </div>
  );
}
