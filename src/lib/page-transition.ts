/**
 * Multi-page navigation transition runtime matching the `.reveal` animation
 * language defined in src/index.css.
 *
 * - Supporting browsers use native CSS Cross-Document View Transitions
 *   (`@view-transition { navigation: auto; }`), deduplicated against the CSS
 *   `.page-reveal` entry animation via `pagereveal`.
 * - Fallback browsers run a crisp 140ms exit fade before internal same-origin
 *   navigations and rely on `.page-reveal` on entry.
 * - `pageshow` always clears transient classes so bfcache restores stay visible.
 */

export interface NavigationInterceptInput {
  href: string | null;
  target: string | null;
  hasDownload: boolean;
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  currentHref: string;
  reducedMotion: boolean;
}

const EXIT_DURATION_MS = 140;

let initialized = false;

export function shouldInterceptNavigation(input: NavigationInterceptInput): string | null {
  if (input.defaultPrevented || input.reducedMotion) return null;
  if (input.button !== 0 || input.metaKey || input.ctrlKey || input.shiftKey || input.altKey) {
    return null;
  }
  if (input.hasDownload) return null;
  if (input.target && input.target.toLowerCase() !== "_self") return null;
  if (!input.href) return null;

  const rawHref = input.href.trim();
  if (!rawHref || rawHref.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:|data:|blob:)/i.test(rawHref)) return null;

  let currentUrl: URL;
  let nextUrl: URL;
  try {
    currentUrl = new URL(input.currentHref);
    nextUrl = new URL(rawHref, currentUrl);
  } catch {
    return null;
  }

  if (nextUrl.origin !== currentUrl.origin) return null;
  if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") return null;

  // Same-document hash jump or identical page click should stay instant.
  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
    return null;
  }

  return nextUrl.href;
}

export function supportsCrossDocumentViewTransition(): boolean {
  if (typeof window === "undefined" || typeof CSS === "undefined") return false;
  return (
    "onpagereveal" in window &&
    typeof CSS.supports === "function" &&
    CSS.supports("view-transition-name: site-header")
  );
}

interface PageRevealEventLike extends Event {
  viewTransition?: {
    finished: Promise<void>;
  } | null;
}

export function initPageTransitions(): void {
  if (initialized || typeof window === "undefined" || typeof document === "undefined") return;
  initialized = true;

  const root = document.documentElement;

  // Deduplicate native Cross-Document View Transitions against CSS `.page-reveal`.
  window.addEventListener("pagereveal", (rawEvent) => {
    const event = rawEvent as PageRevealEventLike;
    root.classList.remove("page-leaving");
    if (!event.viewTransition) return;

    root.dataset.vtActive = "1";
    void event.viewTransition.finished.finally(() => {
      delete root.dataset.vtActive;
    });
  });

  // Always restore cleanly on back/forward cache navigation.
  window.addEventListener("pageshow", () => {
    root.classList.remove("page-leaving");
    delete root.dataset.vtActive;
  });

  // Native MPA View Transitions already animate the outgoing document seamlessly.
  if (supportsCrossDocumentViewTransition()) return;

  let leaving = false;
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nextHref = shouldInterceptNavigation({
      href: anchor.getAttribute("href"),
      target: anchor.getAttribute("target"),
      hasDownload: anchor.hasAttribute("download"),
      defaultPrevented: event.defaultPrevented,
      button: event.button,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      currentHref: window.location.href,
      reducedMotion,
    });

    if (!nextHref || leaving) return;

    event.preventDefault();
    leaving = true;
    root.classList.add("page-leaving");

    window.setTimeout(() => {
      window.location.assign(nextHref);
    }, EXIT_DURATION_MS);
  });
}
