import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { OverloadDialog } from "@/components/overload-dialog";
import { LoginView } from "@/dashboard/login-view";
import { api, setRateLimitHandler } from "@/lib/api";
import { useSession } from "@/store/use-session";
import type { DevExtension, DeveloperMe } from "@/developer/types";
import { DeveloperConsole } from "@/developer/console";

export function DeveloperPage() {
  const { session, ready, signOut } = useSession();
  const userId = session?.user.id || "";

  const [me, setMe] = useState<DeveloperMe | null>(null);
  const [extensions, setExtensions] = useState<DevExtension[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overload, setOverload] = useState({ open: false, seconds: 30, nonce: 0 });

  useEffect(() => {
    setRateLimitHandler((seconds) =>
      setOverload((current) => ({ open: true, seconds, nonce: current.nonce + 1 })),
    );
    return () => setRateLimitHandler(null);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const data = await api<{ me: DeveloperMe }>("/v1/me");
      setMe(data.me);
    } catch {
      // the extension list below shows the real error
    }
  }, []);

  const loadExtensions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ items?: DevExtension[] }>("/v1/me/extensions");
      setExtensions(data.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    void loadExtensions();
    void loadMe();
  }, [loadExtensions, loadMe]);

  useEffect(() => {
    if (!userId) {
      setMe(null);
      setExtensions([]);
      return;
    }
    void loadExtensions();
    void loadMe();
  }, [userId, loadExtensions, loadMe]);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading the developer console…
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LoginView />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <DeveloperConsole
        me={me}
        extensions={extensions}
        loading={loading}
        error={error}
        signOut={() => void signOut()}
        onReload={reload}
        onReloadMe={() => void loadMe()}
      />
      <OverloadDialog
        open={overload.open}
        seconds={overload.seconds}
        nonce={overload.nonce}
        onDismiss={() => setOverload((current) => ({ ...current, open: false }))}
      />
      <Toaster position="bottom-right" />
    </>
  );
}
