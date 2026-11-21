import { useEffect, useState } from "react";
import { AnimatedSidebarNav } from "@/components/animated-sidebar-nav";
import { AnimatedSwitch } from "@/components/animated-switch";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  const updated = document_.updated[language].replace(
    /^(Last updated|Letzte Aktualisierung|Zuletzt aktualisiert|Stand):\s*/i,
    "",
  );

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="hidden lg:block lg:border-r lg:border-white/[0.06] lg:pr-6">
              <div className="sticky top-24">
                <div className="mb-1.5 px-2.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-zinc-600 uppercase">
                  Legal documents
                </div>
                <nav aria-label="Legal documents">
                  <AnimatedSidebarNav
                    activeId={`/${page}`}
                    items={NAV.map((item) => ({
                      id: item.href,
                      label: item.label,
                      href: item.href,
                    }))}
                  />
                </nav>
              </div>
            </aside>

            <article className="min-w-0 max-w-3xl">
              <div className="pb-8">
                <h1 className="resend-title font-display text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
                  {document_.title[language]}
                </h1>
                {updated ? (
                  <p className="mt-2 font-mono text-xs text-zinc-500">Last updated {updated}</p>
                ) : null}

                <div className="mt-6">
                  <AnimatedSwitch<Language>
                    ariaLabel="Language"
                    size="sm"
                    value={language}
                    onChange={setLanguage}
                    options={[
                      { id: "en", label: "English" },
                      { id: "de", label: "Deutsch" },
                    ]}
                  />
                </div>
              </div>

              {/* Trusted html rendered from the app's legal texts by tools/sync_website_legal.py. */}
              <div className="legal-prose mt-4" dangerouslySetInnerHTML={{ __html: html }} />
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
