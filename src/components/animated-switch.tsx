import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwitchOption<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  ariaLabel?: string;
}

interface AnimatedSwitchProps<T extends string> {
  options: SwitchOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  role?: "tablist" | "toolbar" | "group";
  size?: "sm" | "md";
  className?: string;
  buttonClassName?: string;
}

export function AnimatedSwitch<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  role = "group",
  size = "md",
  className,
  buttonClassName,
}: AnimatedSwitchProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    ready: boolean;
  }>({ x: 0, y: 0, w: 0, h: 0, ready: false });

  const measure = useCallback(() => {
    const container = containerRef.current;
    const activeEl = buttonRefs.current[value];
    if (!container || !activeEl) return;

    const x = activeEl.offsetLeft;
    const y = activeEl.offsetTop;
    const w = activeEl.offsetWidth;
    const h = activeEl.offsetHeight;
    setIndicator((prev) =>
      prev.ready && prev.x === x && prev.y === y && prev.w === w && prev.h === h
        ? prev
        : { x, y, w, h, ready: true },
    );
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, options.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    for (const key of Object.keys(buttonRefs.current)) {
      const el = buttonRefs.current[key];
      if (el) ro.observe(el);
    }
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, options.length]);

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex flex-wrap items-center gap-0.5 rounded-full bg-black/[0.06] p-1 dark:bg-white/[0.06]",
        className,
      )}
    >
      {/* Smooth sliding pill highlight */}
      <span
        aria-hidden="true"
        style={{
          transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
          width: indicator.w,
          height: indicator.h,
          opacity: indicator.ready ? 1 : 0,
        }}
        className="pointer-events-none absolute top-0 left-0 rounded-full bg-white shadow-sm transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-white/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
      />

      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              buttonRefs.current[opt.id] = el;
            }}
            type="button"
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? active : undefined}
            aria-pressed={role !== "tablist" ? active : undefined}
            aria-label={opt.ariaLabel}
            data-active={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/40",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-1.5 text-[13px]",
              active
                ? "text-zinc-950 dark:text-white"
                : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100",
              buttonClassName,
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface AnimatedToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

export function AnimatedToggle({ checked, onChange, ariaLabel }: AnimatedToggleProps) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        checked ? "bg-brand" : "bg-black/[0.15] dark:bg-white/[0.12]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </span>
  );
}
