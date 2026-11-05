import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PLAY_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/store", label: "Store" },
  { href: "/docs", label: "Docs" },
];

function isActive(href: string) {
  const path = window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
  if (href === "/") return path === "/" || path === "/index";
  return path === href || path.startsWith(href + "/");
}

export function Brand({ className }: { className?: string }) {
  return (
    <a href="/" className={cn("flex items-center gap-2.5 text-base font-semibold tracking-tight", className)}>
      <img src="/assets/logo.png" alt="" className="size-8 rounded-md" />
      <span>
        Koda<span className="text-brand-ink">Hosting</span>
      </span>
    </a>
  );
}

export function SiteHeader({
  auth,
}: {
  auth?: { signedIn: boolean; onSignIn: () => void; onSignOut: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setDocked(window.scrollY > 64);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const signInLabel = auth?.signedIn ? "Sign out" : "Sign in";
  const signInAction = auth ? (auth.signedIn ? auth.onSignOut : auth.onSignIn) : null;

  return (
    <header
      className={cn(
        "fixed z-50 transition-[top,right,left,border-radius,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        docked
          ? "top-0 right-0 left-0 rounded-none bg-background shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
          : "top-3 right-3 left-3 rounded-2xl bg-card shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:top-4 sm:right-4 sm:left-4",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors duration-200 hover:text-foreground",
                isActive(item.href) && "text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signInAction ? (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={signInAction}>
              {signInLabel}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <a href="/dashboard">Sign in</a>
            </Button>
          )}
          <Button asChild size="sm" className="rounded-full px-4">
            <a href={PLAY_URL}>Get the app</a>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-2 flex flex-col gap-1">
              <Brand className="mb-4" />
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              {signInAction ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signInAction();
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {signInLabel}
                </button>
              ) : (
                <a
                  href="/dashboard"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Dashboard
                </a>
              )}
              <Button asChild className="mt-4 rounded-full">
                <a href={PLAY_URL}>Get it on Google Play</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
