import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "mask" | "scale";

/**
 * Reveals a block once, as it enters the viewport. The hidden state lives in CSS;
 * prefers-reduced-motion turns every variant back into a static element.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        variant === "mask" ? "reveal-mask-host" : variant === "scale" ? "reveal-scale" : "reveal",
        className,
      )}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      {variant === "mask" ? <div className="reveal-mask-inner">{children}</div> : children}
    </div>
  );
}
