import assert from "node:assert/strict";
import test from "node:test";
import { shouldInterceptNavigation, type NavigationInterceptInput } from "./page-transition.ts";

function baseClick(overrides: Partial<NavigationInterceptInput> = {}): NavigationInterceptInput {
  return {
    href: "/docs",
    target: null,
    hasDownload: false,
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentHref: "https://host.kodanetwork.eu/",
    reducedMotion: false,
    ...overrides,
  };
}

test("shouldInterceptNavigation accepts internal same-origin page transitions", () => {
  assert.equal(
    shouldInterceptNavigation(baseClick({ href: "/docs" })),
    "https://host.kodanetwork.eu/docs",
  );
  assert.equal(
    shouldInterceptNavigation(baseClick({ href: "/docs#koda-dash-mcp" })),
    "https://host.kodanetwork.eu/docs#koda-dash-mcp",
  );
  assert.equal(
    shouldInterceptNavigation(baseClick({ href: "/store?category=themes", target: "_self" })),
    "https://host.kodanetwork.eu/store?category=themes",
  );
});

test("shouldInterceptNavigation skips external links, hash jumps, downloads, and modified clicks", () => {
  assert.equal(shouldInterceptNavigation(baseClick({ href: "https://github.com/libredroid-project/KodaNetwork" })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ href: "#ai-notice" })), null);
  assert.equal(
    shouldInterceptNavigation(
      baseClick({ href: "/docs#tunnel", currentHref: "https://host.kodanetwork.eu/docs" }),
    ),
    null,
  );
  assert.equal(shouldInterceptNavigation(baseClick({ target: "_blank" })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ hasDownload: true })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ metaKey: true })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ ctrlKey: true })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ button: 1 })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ defaultPrevented: true })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ reducedMotion: true })), null);
  assert.equal(shouldInterceptNavigation(baseClick({ href: "mailto:support@kodaserv.eu" })), null);
});
