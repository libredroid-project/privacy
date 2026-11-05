import { useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/google-button";
import { Brand } from "@/components/site-header";
import { supabase } from "@/lib/supabase";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) setError(authError.message);
  }

  async function google(credential: string) {
    setError("");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credential,
    });
    setBusy(false);
    if (authError) setError("Google sign-in failed: " + authError.message);
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/app/login-bg.webp')" }}
      />
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl items-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <Brand className="mb-6 w-fit rounded-lg bg-black/30 px-2.5 py-1.5" />

          <Card className="w-full border-0 bg-background/95 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <CardContent className="space-y-5 p-6">
              <div>
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <LogIn className="size-5" />
                </div>
                <h1 className="text-2xl font-medium tracking-tight">Sign in</h1>
                <p className="mt-2 text-base leading-6 text-muted-foreground">
                  The dashboard shows your servers, devices and tickets. Use the account from the app.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dash-email">Email</Label>
                  <Input
                    id="dash-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dash-password">Password</Label>
                  <Input
                    id="dash-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" className="w-full rounded-lg" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Sign in with email
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <GoogleButton onCredential={google} />

              <p className="text-center text-sm leading-6 text-muted-foreground">
                No account yet? Create one in the KodaHosting app (Settings, Account).
              </p>
            </CardContent>
          </Card>

          <a
            href="/"
            className="mt-6 inline-flex text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
          >
            Back to the website
          </a>
        </div>
      </div>

      <p className="pointer-events-none absolute right-4 bottom-3 z-10 text-[13px] text-white/45">
        Minecraft Live 2026, image: IGN
      </p>
    </div>
  );
}
