import { useEffect, useRef, useState } from "react";
import { ChevronRight, Layers, RotateCcw } from "lucide-react";
import { AnimatedSwitch } from "@/components/animated-switch";
import { mountHardwareScene, type HardwareSceneController } from "@/three/hardware-scene";
import { getEngineSpec, type EngineId, type StageViewId } from "@/three/choreography";
import { cn } from "@/lib/utils";

const PLAY_URL = "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost";

interface Props {
  activeEngine: EngineId;
  activeView: StageViewId;
  onViewChange: (view: StageViewId) => void;
}

const VIEW_KEYS: { id: StageViewId; label: string; caption: string }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    caption: "Live uptime, join address, RAM limit, and controls on Android. Drag to rotate.",
  },
  {
    id: "console",
    label: "Console",
    caption: "Unedited real-time Forge server output with direct command bar and one-tap log copy.",
  },
  {
    id: "files",
    label: "Files",
    caption: "Direct access to ~/servers// to edit server.properties and manage mods.",
  },
  {
    id: "rear",
    label: "Back",
    caption: "Xiaomi 17 Pro Max rear camera plateau with dual optical lenses and secondary rear display.",
  },
  {
    id: "side",
    label: "Side",
    caption: "Flat emerald aluminum rail with volume rocker, power key, antenna breaks, and stepped rear plateau.",
  },
  {
    id: "cutaway",
    label: "Cutaway",
    caption: "Exploded ARM64 hardware stack with outbound Bore / FRP tunnel to Frankfurt, DE.",
  },
];

export function Koda3DStage({ activeEngine, activeView, onViewChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HardwareSceneController | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ctrl: HardwareSceneController | null = null;
    try {
      ctrl = mountHardwareScene({
        container: host,
        initialEngine: activeEngine,
        initialView: activeView,
        reducedMotion,
        onContextLost: () => setWebglFallback(true),
      });
      controllerRef.current = ctrl;
    } catch {
      setWebglFallback(true);
      return;
    }

    return () => {
      ctrl?.dispose();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.setEngine(activeEngine);
  }, [activeEngine]);

  useEffect(() => {
    controllerRef.current?.setView(activeView);
  }, [activeView]);

  const currentMeta = VIEW_KEYS.find((v) => v.id === activeView) ?? VIEW_KEYS[0];
  const engineSpec = getEngineSpec(activeEngine);

  return (
    <section
      data-stage-view={activeView}
      className="resend-beams relative overflow-hidden pt-16"
    >
      <div
        aria-hidden="true"
        className="resend-dot-grid pointer-events-none absolute inset-0 opacity-50"
      />
      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-8 lg:py-16">
        {/* Left column: Geist developer typography and clean smoked-black CTA */}
        <div className="min-w-0 lg:col-span-6">
          <a
            href="/mcp"
            className="inline-flex items-center gap-1.5 text-[13.5px] text-zinc-400 transition-colors hover:text-white"
          >
            <span className="text-brand-ink">KodaDash MCP</span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span>Set up AI client access</span>
            <ChevronRight className="size-3.5 text-zinc-500" />
          </a>

          <h1 className="resend-title mt-5 font-display text-[clamp(2.85rem,5.5vw,4.75rem)] leading-[1.03] font-medium tracking-[-0.04em] sm:mt-6">
            Minecraft servers,
            <br />
            on your phone.
          </h1>

          <p className="mt-5 max-w-md text-pretty text-[15.5px] leading-7 text-zinc-400 sm:mt-6 sm:text-[16.5px]">
            The clean way to host worlds without rented racks. Run Paper, Fabric, Forge, or Rust
            Pumpkin on Android with an instant{" "}
            <span className="font-mono text-[0.92em] text-zinc-200">.kodaserv.eu</span> address.
          </p>

          {/* Smoked-black primary CTA (no glow) and calm secondary links */}
          <div className="mt-7 flex flex-wrap items-center gap-x-3.5 gap-y-2 sm:mt-9 sm:gap-5">
            <a
              href={PLAY_URL}
              target="_blank"
              rel="noopener"
              className="koda-btn-black h-10 px-5 text-[13.5px] sm:h-11 sm:px-6 sm:text-[14px] whitespace-nowrap shrink-0"
            >
              Get started
              <ChevronRight className="size-4 text-brand-ink" />
            </a>
            <a
              href="/docs"
              className="inline-flex h-10 items-center gap-1 px-1.5 text-[13.5px] font-medium text-zinc-400 transition-colors hover:text-white sm:h-11 sm:px-2 sm:text-[14px] whitespace-nowrap shrink-0"
            >
              Documentation
              <ChevronRight className="size-3.5 opacity-70" />
            </a>
            <a
              href="/fdroid/"
              className="inline-flex h-10 items-center gap-1 px-1.5 text-[13.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-200 sm:h-11 sm:px-2 sm:text-[14px] whitespace-nowrap shrink-0"
            >
              F-Droid
            </a>
          </div>
        </div>

        {/* Right column: Interactive 3D phone showing the real Android app */}
        <div className="relative flex min-w-0 flex-col items-center lg:col-span-6">
          <div className="relative flex h-[455px] w-full max-w-[540px] items-center justify-center sm:h-[530px]">
            {webglFallback ? (
              <img
                src={
                  activeView === "console"
                    ? "/assets/app/console.webp"
                    : activeView === "files"
                      ? "/assets/app/files.webp"
                      : "/assets/app/dashboard.webp"
                }
                alt="KodaHosting real Android app interface"
                className="max-h-[455px] w-auto rounded-[2rem] shadow-2xl"
              />
            ) : (
              <div
                ref={mountRef}
                data-testid="koda-3d-canvas"
                aria-label="Interactive 3D KodaHosting Android smartphone showing the real app interface. Drag to rotate."
                className={cn(
                  "h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing",
                )}
              />
            )}
          </div>

          {/* Animated multi-switch cleanly below the 3D phone */}
          <div className="mt-2 flex flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <AnimatedSwitch<StageViewId>
                role="toolbar"
                ariaLabel="3D phone screen and hardware cutaway views"
                value={activeView}
                onChange={onViewChange}
                options={VIEW_KEYS.map((item) => ({
                  id: item.id,
                  label: item.label,
                  icon:
                    item.id === "cutaway" ? (
                      <Layers className="size-3.5 text-brand-ink" />
                    ) : undefined,
                }))}
              />

              <button
                type="button"
                onClick={() => controllerRef.current?.resetCamera()}
                aria-label="Reset 3D camera angle"
                title="Reset angle"
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>

            <p className="max-w-md text-center text-[12px] text-zinc-500">
              {activeView === "cutaway"
                ? `Active SoC: ${engineSpec.socLabel} · Drag phone to inspect 360°`
                : currentMeta.caption}
            </p>
            <p className="max-w-md text-center font-mono text-[11px] text-zinc-600">
              This animation was created by Gemini 4 Neon, because I&apos;m to dumb.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
