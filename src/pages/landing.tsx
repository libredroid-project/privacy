import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  Globe,
  Lock,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { AnimatedSwitch } from "@/components/animated-switch";
import { EngineIcon } from "@/components/engine-icon";
import { KodaResendCube } from "@/components/koda-resend-cube";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Koda3DStage } from "@/components/koda-3d-stage";
import { PlayDownloadFab } from "@/components/play-download-fab";
import {
  ENGINES,
  getEngineSpec,
  sanitizeSubdomain,
  type EngineId,
  type StageViewId,
} from "@/three/choreography";
import { cn } from "@/lib/utils";

const PLAY_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

const TESTED_DEVICES = [
  {
    name: "Xiaomi 17 Ultra",
    role: "Primary reference device",
    src: "/assets/devices/xiaomi-17-ultra.jpg",
    pos: "object-center",
  },
  {
    name: "Pixel 10 Pro",
    role: "Tensor ARM64 testbed",
    src: "/assets/devices/pixel-10-pro.jpg",
    pos: "object-center",
  },
  {
    name: "OPPO Find X9",
    role: "Background persistence check",
    src: "/assets/devices/oppo-find-x9.jpg",
    pos: "object-[50%_18%]",
  },
  {
    name: "Xiaomi 14T Pro",
    role: "Thermal & battery baseline",
    src: "/assets/devices/xiaomi-14t-pro.jpg",
    pos: "object-center",
  },
];

const APP_SCREENS: {
  id: StageViewId;
  title: string;
  meta: string;
  src: string;
  alt: string;
}[] = [
  {
    id: "dashboard",
    title: "Server Dashboard",
    meta: "Uptime · Join address · Start, stop & restart · Network meter",
    src: "/assets/app/dashboard.webp",
    alt: "KodaHosting Android app dashboard showing uptime, Forge 1.12.2, OpenJDK 8, join address halloween.kodaserv.eu, and start/stop/restart controls",
  },
  {
    id: "console",
    title: "Live Console",
    meta: "Real-time stdout · One-tap copy log · Direct command input",
    src: "/assets/app/console.webp",
    alt: "KodaHosting Android app live Minecraft console showing Forge server output, copy log, clear, and command bar",
  },
  {
    id: "files",
    title: "Local File Manager",
    meta: "~/servers// · Edit server.properties · Import & trash recovery",
    src: "/assets/app/files.webp",
    alt: "KodaHosting Android app file manager showing ~/servers// with world, plugins, server.properties, and jar files",
  },
];

const FAQS = [
  {
    q: "How many servers can I host at the same time?",
    a: "Each account can host a maximum of six (6) servers simultaneously across all server types to ensure fair use of the shared German VPS proxy infrastructure.",
  },
  {
    q: "Does my phone need to be on 24/7?",
    a: "Your server runs while the KodaHosting app is active on your device. Disable battery optimization for KodaHosting so Android permits background execution, or hibernate idle worlds to save battery without losing your join address.",
  },
  {
    q: "What is KodaDash MCP and can an AI restart my server?",
    a: "KodaDash MCP connects AI coding tools like Claude Code, Codex, or ZCode using a dedicated token with read-only mode and granular capability switches (logs, Modrinth SHA-512 installs, MOTD & settings). AI clients can never start, stop, or restart your server.",
  },
  {
    q: "Is my home IP really hidden?",
    a: "Yes. All player traffic flows through our German reverse-proxy tunnel (Bore / FRP). Friends join via your *.kodaserv.eu or *.kodanetwork.eu subdomain and never see your residential or mobile IP.",
  },
  {
    q: "What about Bedrock crossplay?",
    a: "Bedrock crossplay is temporarily unavailable while Geyser transitions to NetherNet. Java Edition servers are completely unaffected and work out of the box.",
  },
  {
    q: "Can I manage my server from a computer?",
    a: "Yes. Sign in to the web dashboard on this site to follow the live console, browse and edit files, manage extensions, and configure KodaDash from any desktop browser.",
  },
  {
    q: "Do I need to pay anything?",
    a: "No. KodaHosting is completely free, with no subscriptions, no paywalled engines, and no premium tiers. Voluntary Ko-fi support helps cover German relay infrastructure and unlocks nothing.",
  },
];

type WorkbenchTab = "tunnel" | "mcp" | "engines" | "extensions";

const WORKBENCH_TABS: { id: WorkbenchTab; label: string }[] = [
  { id: "tunnel", label: "Subdomain & Tunnel" },
  { id: "mcp", label: "KodaDash MCP" },
  { id: "engines", label: "Nine Server Cores" },
  { id: "extensions", label: "Extension SDK" },
];

export function LandingPage() {
  const [activeEngine, setActiveEngine] = useState<EngineId>("paper");
  const [activeView, setActiveView] = useState<StageViewId>("dashboard");

  return (
    <div className="min-h-svh overflow-x-clip bg-black text-zinc-100">
      <SiteHeader active="overview" />
      <main>
        <Koda3DStage
          activeEngine={activeEngine}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        <EngineStripSection
          activeEngine={activeEngine}
          onSelectEngine={(engine) => setActiveEngine(engine)}
        />
        <ResendCoreShowcaseSection activeEngine={activeEngine} />
        <DeveloperWorkbenchSection
          activeEngine={activeEngine}
          onEngineChange={setActiveEngine}
          onInspectCutaway={() => {
            setActiveView("cutaway");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        <RealAppSection
          activeView={activeView}
          onSelectScreen={(view) => {
            setActiveView(view);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        <HardwareProofSection />
        <FaqSection />
        <ClosingPosterSection />
      </main>
      <SiteFooter />
      <PlayDownloadFab />
    </div>
  );
}

/* 1. Proprietary Engine Strip */

function EngineStripSection({
  activeEngine,
  onSelectEngine,
}: {
  activeEngine: EngineId;
  onSelectEngine: (engine: EngineId) => void;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="resend-arch px-4 pt-16 pb-6 sm:px-10">
        <p className="mx-auto max-w-md text-center text-[15px] leading-6 text-zinc-400">
          Nine real server cores running natively on Android ARM64.
          <br />
          OpenJDK 8 to 25 and Rust, zero rented servers.
        </p>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
          {ENGINES.map((engine) => {
            const active = engine.id === activeEngine;
            return (
              <button
                key={engine.id}
                type="button"
                onClick={() => onSelectEngine(engine.id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl px-3 py-3.5 text-center transition-colors duration-150",
                  active
                    ? "bg-white/[0.08] text-white"
                    : "bg-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                )}
              >
                <EngineIcon
                  id={engine.id}
                  name={engine.name}
                  size="md"
                  className={cn(
                    "transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-80",
                  )}
                />
                <span className="mt-2.5 font-display text-[13px] font-medium whitespace-nowrap">
                  {engine.name}
                </span>
                <span
                  className={cn(
                    "mt-0.5 font-mono text-[10.5px] whitespace-nowrap",
                    active ? "text-brand-ink" : "text-zinc-600",
                  )}
                >
                  {engine.runtimeKind}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#workbench"
            className="inline-flex items-center gap-1 font-display text-[13.5px] font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Inspect runtime &amp; MCP configuration
            <ChevronRight className="size-3.5 text-brand-ink" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* 1.5 Resend-Style 3D Obsidian Server Core & Developer Experience Highlights */

function ResendCoreShowcaseSection({ activeEngine }: { activeEngine: EngineId }) {
  const spec = getEngineSpec(activeEngine);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="resend-dot-grid pointer-events-none absolute inset-0 opacity-40"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Interactive Resend-inspired 3D machined obsidian 3x3x3 server cube */}
          <div className="flex flex-col items-center lg:col-span-5">
            <div className="relative h-[320px] w-full max-w-[380px] sm:h-[370px]">
              <KodaResendCube pulseKey={activeEngine} className="h-full w-full" />
            </div>
            <p className="mt-2 font-mono text-[11px] text-zinc-500">
              {spec.socLabel} · Drag obsidian core to inspect
            </p>
          </div>

          {/* Resend-grade clean monochrome developer experience architecture column */}
          <div className="lg:col-span-7">
            <p className="text-sm font-medium text-brand-ink">Pocket-scale infrastructure</p>
            <h2 className="resend-title mt-2 font-display text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
              Engineered like cloud silicon,
              <br />
              owned by you.
            </h2>
            <p className="mt-4 max-w-xl text-[15.5px] leading-7 text-zinc-400">
              Every world, plugin, and configuration file stays on your local Android flash storage.
              KodaHosting pairs native ARM64 runtimes with a zero-configuration German reverse
              relay so hosting feels as effortless as deploying an API.
            </p>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <div>
                <Cpu className="size-4 text-brand-ink" />
                <h3 className="mt-3 font-display text-[15px] font-medium text-white">
                  Native ARM64 execution
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-zinc-400">
                  Direct OpenJDK 8 to 25 and native Rust binaries with zero virtualization overhead.
                </p>
              </div>

              <div>
                <Globe className="size-4 text-brand-ink" />
                <h3 className="mt-3 font-display text-[15px] font-medium text-white">
                  Zero port-forwarding
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-zinc-400">
                  Outbound Bore and FRP tunnels through Frankfurt mask your residential IP
                  automatically.
                </p>
              </div>

              <div>
                <ShieldCheck className="size-4 text-brand-ink" />
                <h3 className="mt-3 font-display text-[15px] font-medium text-white">
                  Scoped AI control
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-zinc-400">
                  Connect coding agents via KodaDash MCP with SHA-512 verification and human-only
                  power controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 2. Interactive Developer Workbench */

function DeveloperWorkbenchSection({
  activeEngine,
  onEngineChange,
  onInspectCutaway,
}: {
  activeEngine: EngineId;
  onEngineChange: (engine: EngineId) => void;
  onInspectCutaway: () => void;
}) {
  const [tab, setTab] = useState<WorkbenchTab>("tunnel");
  const [rawName, setRawName] = useState("halloween");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanSubdomain = sanitizeSubdomain(rawName);
  const fullAddress = `${cleanSubdomain}.kodaserv.eu`;
  const spec = getEngineSpec(activeEngine);

  const mcpJson = JSON.stringify(
    {
      mcpServers: {
        [`kodahosting-${cleanSubdomain}`]: {
          type: "http",
          url: `https://${fullAddress}/mcp`,
          headers: {
            Authorization: "Bearer ${KODA_MCP_TOKEN}",
          },
        },
      },
    },
    null,
    2,
  );

  function copyText(key: string, value: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1600);
  }

  return (
    <section id="workbench" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="resend-title font-display text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
            First-class server control.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-zinc-400">
            Configure instant subdomains without port-forwarding, issue scoped KodaDash MCP tokens
            for AI coding agents, or package{" "}
            <span className="font-mono text-[0.9em] text-zinc-200">.kodaext</span> extensions.
          </p>
        </div>

        {/* Animated horizontal multi-switch */}
        <div className="mt-10 flex justify-center">
          <AnimatedSwitch<WorkbenchTab>
            role="tablist"
            ariaLabel="Developer architecture workbench"
            value={tab}
            onChange={setTab}
            options={WORKBENCH_TABS}
            className="justify-center"
          />
        </div>

        {/* Resend specular studio panel (no noisy gray wireframe box) */}
        <div className="resend-glass-panel mx-auto mt-8 max-w-5xl overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.025] px-5 py-3.5 sm:px-7">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <span className="text-zinc-200">kodahosting</span>
              <span aria-hidden="true" className="text-zinc-600">
                /
              </span>
              <span className="text-brand-ink">
                {WORKBENCH_TABS.find((t) => t.id === tab)?.label}
              </span>
            </div>
            <button
              type="button"
              onClick={onInspectCutaway}
              className="koda-btn-pill h-8 px-3.5 text-xs whitespace-nowrap shrink-0"
            >
              Inspect 3D cutaway
            </button>
          </div>

          <div className="min-w-0 p-6 sm:p-9">
            {tab === "tunnel" && (
              <div className="space-y-8">
                <div className="max-w-xl">
                  <h3 className="font-display text-xl font-medium tracking-[-0.02em] text-white">
                    Claim a clean subdomain. Never touch your router.
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-7 text-zinc-400">
                    Type any server name to preview your Java Edition join address. Your Android
                    device dials an encrypted outbound Bore / FRP tunnel to our German relay so
                    your home IP stays strictly hidden.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="koda-subdomain-input"
                      className="block text-xs font-medium text-zinc-400"
                    >
                      Server subdomain
                    </label>
                    <div className="mt-2 flex items-center overflow-hidden rounded-xl bg-black/80 ring-1 ring-white/[0.08] transition-colors focus-within:ring-white/25">
                      <input
                        id="koda-subdomain-input"
                        type="text"
                        value={rawName}
                        onChange={(e) => setRawName(e.target.value)}
                        placeholder="survival"
                        maxLength={24}
                        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 font-mono text-sm text-white outline-none placeholder:text-zinc-600"
                      />
                      <span className="bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-brand-ink whitespace-nowrap">
                        .kodaserv.eu
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyText("address", fullAddress)}
                    className="koda-btn-black h-[42px] px-5 text-sm whitespace-nowrap shrink-0"
                  >
                    {copiedKey === "address" ? (
                      <>
                        <Check className="size-4 text-brand-ink" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-4 text-zinc-400" />
                        Copy address
                      </>
                    )}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-black/70 p-4">
                    <div className="font-mono text-[11px] text-zinc-500">1. Local Device</div>
                    <div className="mt-1 font-display text-sm font-medium text-white">
                      Android Phone
                    </div>
                    <div className="mt-1.5 font-mono text-xs text-zinc-400">
                      ~/servers/{cleanSubdomain}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <div className="font-mono text-[11px] text-brand-ink">2. DE Frankfurt VPS</div>
                    <div className="mt-1 font-display text-sm font-medium text-white">
                      Bore / FRP Reverse Relay
                    </div>
                    <div className="mt-1.5 font-mono text-xs text-zinc-400">
                      Home IP masked · P.R.A.E.T.O.R.
                    </div>
                  </div>

                  <div className="rounded-2xl bg-black/70 p-4">
                    <div className="font-mono text-[11px] text-zinc-500">
                      3. Java Edition Players
                    </div>
                    <div className="mt-1 font-display text-sm font-medium text-white">
                      Direct Join
                    </div>
                    <div className="mt-1.5 truncate font-mono text-xs text-brand-ink">
                      {fullAddress}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "mcp" && (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div className="max-w-xl">
                    <h3 className="font-display text-xl font-medium tracking-[-0.02em] text-white">
                      Connect Claude Code, Cursor, Codex, or ZCode safely.
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-7 text-zinc-400">
                      Enable MCP and choose granular permissions inside the KodaHosting Android app,
                      then open the MCP setup page to pick a server, inspect active permissions, and
                      copy your pre-filled client config.
                    </p>
                  </div>
                  <a
                    href="/mcp"
                    className="koda-btn-black h-10 px-5 text-sm whitespace-nowrap shrink-0"
                  >
                    Open KodaDash MCP
                    <ChevronRight className="size-4 text-brand-ink" />
                  </a>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-2xl bg-black/70 px-4 py-3.5">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">App-controlled scopes</div>
                      <div className="text-xs text-zinc-500">
                        Read-only mode, console, files, settings, and Modrinth SHA-512
                      </div>
                    </div>
                    <span className="font-mono text-xs text-zinc-400">ANDROID APP</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.025] px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Lock className="size-3.5 text-brand-ink" />
                      <div>
                        <div className="text-sm font-medium text-zinc-300">
                          Start / Stop / Restart
                        </div>
                        <div className="text-xs text-zinc-500">Hard-blocked from AI clients</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-brand-ink">LOCKED</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-black/80">
                  <div className="flex items-center justify-between bg-white/[0.03] px-4 py-2.5">
                    <span className="font-mono text-xs text-zinc-400">
                      .mcp.json · Preview for {fullAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("mcp", mcpJson)}
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-300 transition-colors hover:text-white"
                    >
                      {copiedKey === "mcp" ? (
                        <>
                          <Check className="size-3.5 text-brand-ink" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copy example
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-zinc-200">
                    <code>{mcpJson}</code>
                  </pre>
                </div>
              </div>
            )}

            {tab === "engines" && (
              <div className="space-y-6">
                <div className="max-w-xl">
                  <h3 className="font-display text-xl font-medium tracking-[-0.02em] text-white">
                    Nine engines. OpenJDK 8 to 25 and native Rust.
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-7 text-zinc-400">
                    Select any server core below to inspect its runtime profile and update the
                    laser-etched ARM64 SoC inside the 3D phone cutaway above.
                  </p>
                </div>

                <AnimatedSwitch<EngineId>
                  role="group"
                  ariaLabel="Select Minecraft server engine"
                  value={activeEngine}
                  onChange={onEngineChange}
                  size="sm"
                  options={ENGINES.map((engine) => ({
                    id: engine.id,
                    label: engine.name,
                    icon: <EngineIcon id={engine.id} name={engine.name} size="sm" />,
                  }))}
                />

                <div className="grid gap-4 rounded-2xl bg-black/70 p-5 sm:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <EngineIcon id={spec.id} name={spec.name} size="lg" className="mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Selected engine</div>
                      <div className="mt-0.5 font-display text-base font-medium text-white">
                        {spec.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">{spec.ecosystem}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Runtime</div>
                    <div className="mt-1 font-mono text-sm text-brand-ink">{spec.runtime}</div>
                    <div className="mt-0.5 font-mono text-xs text-zinc-500">{spec.socLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Typical memory</div>
                    <div className="mt-1 font-mono text-sm text-zinc-200 tabular">
                      {spec.ramBaseline}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">Adjustable in-app RAM cap</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/80 p-4 font-mono text-xs leading-6 text-zinc-300">
                  {spec.bootLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {tab === "extensions" && (
              <div className="space-y-6">
                <div className="max-w-xl">
                  <h3 className="font-display text-xl font-medium tracking-[-0.02em] text-white">
                    Build &amp; publish KodaHosting extensions.
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-7 text-zinc-400">
                    Package custom screens, automations, and server workflows as signed{" "}
                    <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-xs text-zinc-100">
                      .kodaext
                    </code>{" "}
                    bundles. Edit directly in our browser CodeMirror IDE and submit to the
                    Extension Store.
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl bg-black/80">
                  <div className="bg-white/[0.03] px-4 py-2.5 font-mono text-xs text-zinc-400">
                    manifest.json · .kodaext bundle
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-zinc-200">
                    <code>{`{
  "id": "eu.kodanetwork.backup-guard",
  "name": "Empty-Server Backup Guard",
  "version": "1.2.0",
  "permissions": ["server.status", "files.backup"],
  "entry": "src/main.js"
}`}</code>
                  </pre>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="/developer"
                    className="koda-btn-black h-10 px-5 text-sm whitespace-nowrap shrink-0"
                  >
                    Open Developer Console
                    <ChevronRight className="size-4 text-brand-ink" />
                  </a>
                  <a
                    href="/store"
                    className="koda-btn-pill h-10 px-5 text-sm whitespace-nowrap shrink-0"
                  >
                    Browse Extension Store
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 3. Real Unedited Android App Capture & Screens (borderless tonal showcase) */

function RealAppSection({
  activeView,
  onSelectScreen,
}: {
  activeView: StageViewId;
  onSelectScreen: (view: StageViewId) => void;
}) {
  return (
    <section id="app" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="resend-arch pt-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-brand-ink">Unedited Android capture</p>
              <h2 className="resend-title mt-2 font-display text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
                Nothing mocked. The real app on real silicon.
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="koda-btn-pill h-10 px-5 text-sm whitespace-nowrap shrink-0"
              >
                Open Web Dashboard
              </a>
              <a
                href="/docs"
                className="inline-flex items-center gap-1 font-display text-sm font-medium text-zinc-400 transition-colors hover:text-white whitespace-nowrap shrink-0"
              >
                Read the docs
                <ChevronRight className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Pure-black editorial showcase: zero extra colored boxes behind the phone captures */}
          <div className="mt-14 grid grid-cols-2 items-start gap-x-6 gap-y-12 sm:gap-x-10 lg:grid-cols-4">
            {/* 1. Unedited live boot video floating directly on pure black */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-full max-w-[232px] rounded-[2.1rem] bg-gradient-to-b from-zinc-500/60 via-zinc-800/50 to-zinc-600/60 p-[3px] shadow-[0_28px_64px_rgba(0,0,0,0.92)]">
                <div className="overflow-hidden rounded-[1.95rem] bg-black">
                  <video
                    src="/assets/app/terminal.mp4"
                    poster="/assets/app/terminal-poster.webp"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    aria-label="Screen recording of the KodaHosting console starting a real Minecraft server on Android"
                    className="block w-full bg-black"
                  />
                </div>
              </div>
              <div className="mt-5 max-w-[232px]">
                <div className="inline-flex items-center gap-1.5 font-display text-[15px] font-medium text-white">
                  <Terminal className="size-3.5 text-brand-ink" />
                  Live Boot Recording
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Unedited Forge boot on Android 15 flash storage
                </p>
              </div>
            </div>

            {/* 2-4. Real Android screenshots floating directly on pure black */}
            {APP_SCREENS.map((screen) => {
              const selected = activeView === screen.id;
              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => onSelectScreen(screen.id)}
                  aria-pressed={selected}
                  className="group flex flex-col items-center bg-transparent text-center focus-visible:outline-none"
                >
                  <img
                    src={screen.src}
                    alt={screen.alt}
                    loading="lazy"
                    className="w-full max-w-[232px] drop-shadow-[0_28px_48px_rgba(0,0,0,0.95)] transition-transform duration-300 group-hover:-translate-y-1.5"
                  />
                  <div className="mt-5 max-w-[232px]">
                    <div className="font-display text-[15px] font-medium text-white transition-colors group-hover:text-brand-ink">
                      {screen.title}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{screen.meta}</p>
                    {selected && (
                      <div className="mt-2 font-mono text-[11px] text-brand-ink">
                        Active in 3D view
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 4. Verified Pocket Hardware Strip */

function HardwareProofSection() {
  return (
    <section id="hardware" className="bg-black py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-brand-ink">Independent German engineering</p>
            <h2 className="resend-title mt-2 font-display text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
              Plainly, a phone in a room.
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-7 text-zinc-400">
            Built by one independent developer around real pocket hardware instead of rented racks.
            Database, reverse-proxy relay, and GDPR jurisdiction sit in Germany.
          </p>
        </div>

        {/* Full-color 3:4 portrait photographs so every tested phone is unmistakably clear */}
        <div className="mt-12 grid grid-cols-2 gap-5 sm:gap-7 md:grid-cols-4">
          {TESTED_DEVICES.map((device) => (
            <figure key={device.name} className="group">
              <div className="overflow-hidden rounded-2xl bg-zinc-950">
                <img
                  src={device.src}
                  alt={device.name}
                  loading="lazy"
                  className={cn(
                    "aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
                    device.pos,
                  )}
                />
              </div>
              <figcaption className="mt-3.5">
                <div className="font-display text-[15px] font-medium text-zinc-100">
                  {device.name}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{device.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="space-y-1">
            <p>
              Device photographs from Wikimedia Commons, shown for identification only; all rights
              belong to the respective manufacturers.
            </p>
            <p>
              3D smartphone model{" "}
              <a
                href="https://sketchfab.com/3d-models/free-xiaomi-17-pro-max-014f9880c8764d18b3f4f00aac165a5d"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                &quot;(Free) Xiaomi 17 pro max&quot;
              </a>{" "}
              by{" "}
              <a
                href="https://sketchfab.com/TahmidTauz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                TahmidTauz
              </a>{" "}
              licensed under{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                CC BY 4.0
              </a>{" "}
              (see{" "}
              <a
                href="/licenses"
                className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Licenses
              </a>
              ).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
            <ShieldCheck className="size-3.5 text-brand-ink" />
            P.R.A.E.T.O.R. verified security
          </span>
        </div>
      </div>
    </section>
  );
}

/* 5. Calm Technical FAQ */

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-black py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-sm font-medium text-brand-ink">Technical FAQ</p>
          <h2 className="resend-title mt-2 font-display text-4xl font-medium tracking-[-0.035em]">
            Direct answers.
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-zinc-400">
            Hardware limits, networking, KodaDash MCP, Bedrock status, and zero-cost
            sustainability. Read the complete manual in the{" "}
            <a
              href="/docs"
              className="font-medium text-zinc-200 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
            >
              documentation
            </a>
            .
          </p>
        </div>

        <div className="divide-y divide-white/[0.06] lg:col-span-8">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="font-display text-[15.5px] font-medium text-zinc-100">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-zinc-500 transition-transform duration-200",
                      isOpen && "rotate-180 text-brand-ink",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-8 text-[14.5px] leading-7 text-zinc-400">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* 6. Closing Poster */

function ClosingPosterSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="resend-arch px-6 pt-20 pb-8 text-center sm:px-10 sm:pt-24">
        <p className="text-sm font-medium text-brand-ink">Free on Android · No credit card</p>
        <h2 className="resend-title mx-auto mt-3 max-w-2xl font-display text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
          Hosting reimagined.
          <br />
          Available today.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[15.5px] leading-7 text-zinc-400">
          Install KodaHosting from Google Play or F-Droid, initialize a world on local storage, and
          share your <span className="font-mono text-zinc-200">.kodaserv.eu</span> address in
          minutes.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href={PLAY_URL}
            target="_blank"
            rel="noopener"
            className="koda-btn-black h-11 px-6 text-[14px] whitespace-nowrap shrink-0"
          >
            Get started
            <ChevronRight className="size-4 text-brand-ink" />
          </a>
          <a
            href="/fdroid/"
            className="inline-flex h-11 items-center gap-1.5 px-2 font-display text-[14px] font-medium text-zinc-400 transition-colors hover:text-white whitespace-nowrap shrink-0"
          >
            F-Droid repository
            <ChevronRight className="size-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </section>
  );
}
