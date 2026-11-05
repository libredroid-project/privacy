import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import legal from "@/generated/legal.json";

type PageKey = "privacy" | "tos" | "impressum";
type Language = "en" | "de";

const NAV = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/tos", label: "Terms of Service" },
  { href: "/impressum", label: "Impressum" },
  { href: "/licenses", label: "Licenses" },
];

/** The generated html starts with the h1 and the updated line; the page header shows both. */
function articleBody(html: string): string {
  return html
    .replace(/^<p class="updated">[\s\S]*?<\/p>\s*/, "")
    .replace(/^<h1>[\s\S]*?<\/h1>\s*/, "");
}

export function LegalPage({ page }: { page: PageKey }) {
  const document_ = legal[page];
  const [language, setLanguage] = useState<Language>(() => {
    const wanted = new URLSearchParams(window.location.search).get("lang");
    if (wanted === "de" || wanted === "en") return wanted;
    try {
      return localStorage.getItem("kodaLegalLang") === "de" ? "de" : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("kodaLegalLang", language);
    } catch {
      // storage can be disabled, the switch still works for this page view
    }
    document.title = `${document_.title[language]} | KodaHosting`;
  }, [document_, language]);

  const html = articleBody(document_.html[language]);
  const updated = document_.updated[language].replace(/^(Last updated|Letzte Aktualisierung|Zuletzt aktualisiert|Stand):\s*/i, "");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-10 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="mb-3 px-2 text-sm font-medium text-muted-foreground">
                  Legal
                </div>
                <nav aria-label="Legal documents">
                  <ul className="space-y-0.5">
                    {NAV.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className={cn(
                            "block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                            item.href === `/${page}`
                              ? "border-brand font-medium text-foreground"
                              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>

            <article className="min-w-0 max-w-3xl">
              <div className="pb-8">
                <h1 className="text-3xl font-medium tracking-[-0.035em] sm:text-4xl">                  {document_.title[language]}
                </h1>
                {updated ? <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p> : null}

                <ToggleGroup
                  type="single"
                  value={language}
                  onValueChange={(value) => value && setLanguage(value as Language)}
                  className="mt-6 w-fit gap-1 rounded-lg border p-1"
                  aria-label="Language"
                >
                  <ToggleGroupItem value="en" size="sm" className="rounded-md px-3 text-xs">
                    English
                  </ToggleGroupItem>
                  <ToggleGroupItem value="de" size="sm" className="rounded-md px-3 text-xs">
                    Deutsch
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Trusted html rendered from the app's legal texts by tools/sync_website_legal.py. */}
              <div className="legal-prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
