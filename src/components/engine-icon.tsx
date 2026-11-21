import type { EngineId } from "@/three/choreography";
import { cn } from "@/lib/utils";

const PROPRIETARY_LOGOS: Partial<Record<EngineId, { src: string; wide?: boolean }>> = {
  paper: { src: "/assets/engines/paper.png", wide: true },
  fabric: { src: "/assets/engines/fabric-big.png" },
  forge: { src: "/assets/engines/forge.png", wide: true },
  neoforge: { src: "/assets/engines/neoforge.png" },
  vanilla: { src: "/assets/engines/vanilla.png" },
  pumpkin: { src: "/assets/engines/pumpkin.png" },
};

interface EngineIconProps {
  id: EngineId;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EngineIcon({ id, name, size = "md", className }: EngineIconProps) {
  const logo = PROPRIETARY_LOGOS[id];
  if (logo) {
    if (logo.wide) {
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md bg-white/95 px-1.5",
            size === "sm" ? "h-4 max-w-[44px]" : size === "lg" ? "h-8 max-w-[72px]" : "h-7 max-w-[62px]",
            className,
          )}
        >
          <img
            src={logo.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-[72%] w-auto object-contain"
          />
        </span>
      );
    }

    return (
      <img
        src={logo.src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={cn(
          "shrink-0 rounded object-contain",
          size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-7",
          className,
        )}
      />
    );
  }

  const boxSize = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-7";

  if (id === "purpur") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn("shrink-0", boxSize, className)}
        fill="none"
      >
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#2a163d" />
        <path d="M7 15.5c0-3.1 2.2-5.5 5-5.5s5 2.4 5 5.5H7Z" fill="#c084fc" />
        <circle cx="17.5" cy="11.5" r="2" fill="#e9d5ff" />
        <path d="M8.5 15.5v2M15.5 15.5v2" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "folia") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn("shrink-0", boxSize, className)}
        fill="none"
      >
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#0f291e" />
        <path d="M17.5 6.5C12.2 6.8 8 10.2 7.5 16.5c5.5-.4 9.7-4 10-10Z" fill="#4ade80" />
        <path d="M7.5 16.5L14 10" stroke="#052e16" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("shrink-0", boxSize, className)}
      fill="none"
      data-engine={name}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#0d2238" />
      <path d="M6.5 7.5L12 17.5L17.5 7.5H14.5L12 12.4L9.5 7.5H6.5Z" fill="#38bdf8" />
    </svg>
  );
}
