import { useEffect, useRef, useState } from "react";
import { mountResendCubeScene, type ResendCubeController } from "@/three/resend-cube-scene";
import { cn } from "@/lib/utils";

interface Props {
  pulseKey?: string;
  className?: string;
}

export function KodaResendCube({ pulseKey, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<ResendCubeController | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ctrl: ResendCubeController | null = null;
    try {
      ctrl = mountResendCubeScene({
        container: el,
        reducedMotion,
        onContextLost: () => setFallback(true),
      });
      ctrlRef.current = ctrl;
    } catch {
      setFallback(true);
      return;
    }

    return () => {
      ctrl?.dispose();
      ctrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pulseKey) {
      ctrlRef.current?.pulseAccent();
    }
  }, [pulseKey]);

  if (fallback) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-3xl bg-white/[0.02] text-xs font-mono text-zinc-500",
          className,
        )}
      >
        KodaHosting ARM64 Core
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      data-testid="koda-resend-cube-canvas"
      aria-label="Interactive 3D machined obsidian server core sculpture. Drag to rotate."
      className={cn(
        "cursor-grab touch-pan-y select-none active:cursor-grabbing",
        className,
      )}
    />
  );
}
