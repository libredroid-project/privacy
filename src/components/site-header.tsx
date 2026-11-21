import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavSection = "overview" | "store" | "docs" | "developer" | "dashboard";

interface HeaderAuth {
  signedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

interface Props {
  active?: NavSection;
  auth?: HeaderAuth;
}

const NAV: { id: NavSection; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "store", label: "Store", href: "/store" },
  { id: "docs", label: "Docs", href: "/docs" },
  { id: "developer", label: "Developers", href: "/developer" },
];

export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <a
      href="/"
      className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/40"
    >
      <img
        src="/assets/logo.png"
        alt=""
        aria-hidden="true"
        className={cn(
          "rounded-lg object-cover",
          size === "sm" ? "size-6" : "size-7",
        )}
      />
      <span
        className={cn(
          "font-display font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white",
          size === "sm" ? "text-[15px]" : "text-[17px]",
        )}
      >
        Koda<span className="text-brand-ink">Hosting</span>
      </span>
    </a>
  );
}

export function SiteHeader({ active, auth }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
        <Brand />

        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap shrink-0 font-display text-[14px] font-medium transition-colors duration-150",
                  isActive ? "text-white" : "text-zinc-400 hover:text-white",
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          {auth ? (
            <button
              type="button"
              onClick={auth.signedIn ? auth.onSignOut : auth.onSignIn}
              className="koda-btn-pill h-9 px-4 text-[13.5px] whitespace-nowrap shrink-0"
            >
              {auth.signedIn ? "Sign out" : "Sign in"}
            </button>
          ) : (
            <a
              href="/dashboard"
              className="koda-btn-pill h-9 px-4 text-[13.5px] whitespace-nowrap shrink-0"
            >
              Dashboard
            </a>
          )}
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 transition-colors hover:bg-white/[0.12] hover:text-white md:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-[#060608] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3.5 py-2.5 font-display text-sm font-medium transition-colors",
                  active === item.id
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
