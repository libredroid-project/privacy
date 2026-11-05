import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/google-button";
import { supabase } from "@/lib/supabase";

export function LoginDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setError("");
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setPassword("");
    onOpenChange(false);
    window.setTimeout(() => onSuccess?.(), 180);
  }

  async function google(credential: string) {
    setError("");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credential,
    });
    setBusy(false);
    if (authError) {
      setError("Google sign-in failed: " + authError.message);
      return;
    }
    onOpenChange(false);
    window.setTimeout(() => onSuccess?.(), 180);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
            <LogIn className="size-5" />
          </div>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Use the account from the KodaHosting app. Submitting and managing extensions needs it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-email">Email</Label>
            <Input
              id="store-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-password">Password</Label>
            <Input
              id="store-password"
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
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in with email
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <GoogleButton onCredential={google} />

        <p className="text-center text-xs leading-5 text-muted-foreground">
          No account yet? Create one in the KodaHosting app (Settings → Account).
        </p>
      </DialogContent>
    </Dialog>
  );
}
