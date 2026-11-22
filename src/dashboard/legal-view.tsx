import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AnimatedSwitch } from "@/components/animated-switch";
import legal from "@/generated/legal.json";

type Language = "en" | "de";
type PageKey = "tos" | "privacy" | "impressum";

const ORDER: PageKey[] = ["tos", "privacy", "impressum"];
const HREF: Record<PageKey, string> = {
  tos: "/tos",
  privacy: "/privacy",
  impressum: "/impressum",
};

function articleBody(html: string): string {
  return html
    .replace(/^<p class="updated">[\s\S]*?<\/p>\s*/, "")
    .replace(/^<h1>[\s\S]*?<\/h1>\s*/, "");
}

export function LegalView() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem("kodaLegalLang") === "de" ? "de" : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("kodaLegalLang", language);
    } catch {
      // ignore storage failures, the view still switches
    }
  }, [language]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">Legal</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            The documents that apply to the app, the dashboard, and the network.
          </p>
        </div>
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

      {ORDER.map((key) => {
        const doc = legal[key];
        const updated = doc.updated[language].replace(
          /^(Last updated|Letzte Aktualisierung|Zuletzt aktualisiert|Stand):\s*/i,
          "",
        );
        return (
          <section key={key} className="resend-glass-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="font-display text-lg font-medium text-white">{doc.title[language]}</h2>
                {updated ? (
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">Last updated {updated}</p>
                ) : null}
              </div>
              <a
                href={HREF[key]}
                className="koda-btn-pill h-8 px-3.5 text-xs"
              >
                Full page
                <ExternalLink className="size-3.5 opacity-75" />
              </a>
            </div>
            <div
              className="legal-prose mt-4 max-h-[32rem] overflow-y-auto pr-2"
              dangerouslySetInnerHTML={{ __html: articleBody(doc.html[language]) }}
            />
          </section>
        );
      })}
    </div>
  );
}
