import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/site-header";

const PLAY_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/store", label: "Extension store" },
      { href: "/#how", label: "How it works" },
      { href: "https://ko-fi.com/kodahosting", label: "Support development" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/developer", label: "Developer console" },
      { href: "/docs", label: "Documentation" },
      { href: "https://github.com/libredroid-project/KodaNetwork", label: "Source on GitHub" },
      {
        href: "https://github.com/libredroid-project/KodaNetwork/tree/main/extensions",
        label: "Extension docs",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/tos", label: "Terms of Service" },
      { href: "/licenses", label: "Licenses" },
      { href: "/impressum", label: "Impressum" },
    ],
  },
];

export function SiteFooter({
  statusLine,
  className,
}: {
  statusLine?: ReactNode;
  className?: string;
}) {
  return (
    <footer className={cn("bg-card", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Brand />
            <p className="mt-4 max-w-xs text-base leading-7 text-muted-foreground">
              A real Minecraft server, hosted on the Android phone in your pocket. No machine to
              rent, no monthly fee for the console.
            </p>
            <a
              href={PLAY_URL}
              className="mt-5 inline-flex text-sm font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-brand"
            >
              Get it on Google Play
            </a>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-medium">{column.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 text-[13px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 KodaHosting. All rights reserved.</span>
          {statusLine ? <span>{statusLine}</span> : null}
          <span className="max-w-md sm:text-right">
            KodaHosting is not an official Minecraft product, is not approved by or associated with
            Mojang or Microsoft.
          </span>
        </div>
      </div>
    </footer>
  );
}
