import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setStatus({ kind: "err", text: "The password needs at least 6 characters." });
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 pt-28 pb-16 sm:px-6">
        <Card className="w-full max-w-md shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
              <KeyRound className="size-5" />
            </div>
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              This page opens from the password reset email. Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!ready ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Checking the link…
              </p>
            ) : done ? (
              <>
                <Alert>
                  <AlertTitle>Password saved</AlertTitle>
                  <AlertDescription>You can now sign in with the new password.</AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <a href="/dashboard">Open the dashboard</a>
                </Button>
              </>
            ) : !hasSession ? (
              <>
                <Alert variant="destructive">
                  <AlertTitle>No valid reset link</AlertTitle>
                  <AlertDescription>
                    Open this page through the link in the email. The link is only valid for a short
                    time.
                  </AlertDescription>
                </Alert>
                <p className="text-xs leading-5 text-muted-foreground">
                  If the link expired, request a new email in the KodaHosting app (Settings → Account →
                  Password forgotten) or{" "}
                  <a
                    href="/dashboard"
                    className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-brand"
                  >
                    sign in
                  </a>{" "}
                  if your password still works.
                </p>
              </>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="at least 6 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeat-password">Repeat password</Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="repeat it"
                    value={repeat}
                    onChange={(event) => setRepeat(event.target.value)}
                    required
                  />
                </div>

                {status.kind === "err" ? (
                  <Alert variant="destructive">
                    <AlertDescription>{status.text}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full" disabled={status.kind === "busy"}>
                  {status.kind === "busy" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
