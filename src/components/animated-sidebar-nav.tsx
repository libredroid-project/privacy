import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedSidebarItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
}

interface AnimatedSidebarNavProps {
  items: AnimatedSidebarItem[];
  activeId: string | null;
  className?: string;
  scrollActiveIntoView?: boolean;
}

/**
 * Vertical navigation list with a spring-gliding active glass highlight and
 * animated 2px Koda orange indicator bar. Works identically in dark and light themes.
 */
export function AnimatedSidebarNav({
  items,
  activeId,
  className,
  scrollActiveIntoView = false,
}: AnimatedSidebarNavProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [indicator, setIndicator] = useState<{ y: number; h: number; visible: boolean }>({
    y: 0,
    h: 0,
    visible: false,
  });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list || !activeId) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const target = itemRefs.current[activeId];
    if (!target) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const y = target.offsetTop;
    const h = target.offsetHeight;
    setIndicator((prev) =>
      prev.visible && prev.y === y && prev.h === h ? prev : { y, h, visible: true },
    );
  }, [activeId]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  useEffect(() => {
    if (scrollActiveIntoView && activeId) {
      itemRefs.current[activeId]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeId, scrollActiveIntoView]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, items.length]);

  return (
    <ul ref={listRef} className={cn("relative space-y-0.5", className)}>
      {/* Animated vertical sliding active glass highlight */}
      <li
        aria-hidden="true"
        style={{
          transform: `translate3d(0, ${indicator.y}px, 0)`,
          height: indicator.h,
          opacity: indicator.visible ? 1 : 0,
        }}
        className="pointer-events-none absolute inset-x-0 top-0 z-0 rounded-lg bg-black/[0.06] transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-white/[0.065] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      />

      {items.map((item) => {
        const active = activeId === item.id;
        const Icon = item.icon;
        const sharedClass = cn(
          "group relative z-10 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-display text-[13.5px] leading-5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50",
          active
            ? "font-medium text-zinc-950 dark:text-white"
            : "text-zinc-600 hover:bg-black/[0.035] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.035] dark:hover:text-zinc-100",
        );

        const content = (
          <>
            {Icon ? (
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5",
                  active ? "text-brand-ink" : "opacity-75 group-hover:opacity-100",
                )}
              />
            ) : null}
            <span className="truncate">{item.label}</span>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <a
                ref={(el) => {
                  itemRefs.current[item.id] = el;
                }}
                href={item.href}
                onClick={item.onClick}
                aria-current={active ? "page" : undefined}
                className={sharedClass}
              >
                {content}
              </a>
            ) : (
              <button
                ref={(el) => {
                  itemRefs.current[item.id] = el;
                }}
                type="button"
                onClick={item.onClick}
                aria-current={active ? "page" : undefined}
                className={sharedClass}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
