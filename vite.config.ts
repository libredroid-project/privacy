import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  buildSeoHeadTags,
  HTML_ENTRIES,
  resolveEntryKey,
  SEO_PAGES,
} from "./src/lib/seo.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Injects standardized title, favicon, canonical, Open Graph, Twitter Card,
 * robots, JSON-LD, and Google Fonts tags from src/lib/seo.ts into every HTML
 * entry point during both dev and production builds.
 */
function seoMetadata(): Plugin {
  return {
    name: "koda-seo-metadata",
    transformIndexHtml: {
      order: "pre",
      handler(_html, ctx) {
        const key = resolveEntryKey(ctx.filename || ctx.path || "");
        if (!key) return [];
        return buildSeoHeadTags(SEO_PAGES[key]);
      },
    },
  };
}

/**
 * Vercel runs with cleanUrls, so the site is linked as /store, /dashboard and
 * /invite/<token>. The dev server and the preview server need the same mapping,
 * otherwise every internal link would 404 locally.
 */
function cleanUrls(): Plugin {
  const resolve = (url: string, baseDir: string): string | null => {
    const [pathname, search = ""] = url.split("?");
    if (!pathname || pathname === "/") return null;
    if (pathname.startsWith("/@") || pathname.startsWith("/node_modules") || pathname.startsWith("/src")) return null;
    // extension ids contain dots, so the developer console cannot use the generic
    // "a dot means an asset" rule. every /developer/* path is the same entry.
    if (pathname.startsWith("/developer/")) {
      return "/developer.html" + (search ? "?" + search : "");
    }
    if (pathname.includes(".")) return null;

    const candidates: string[] = [];
    if (pathname.startsWith("/developer/")) candidates.push("developer.html");
    if (pathname.startsWith("/invite/")) candidates.push("invite.html");
    if (pathname === "/docs" || pathname === "/docs/") candidates.push("docs/index.html");
    if (pathname === "/fdroid" || pathname === "/fdroid/") candidates.push("fdroid/index.html");
    if (pathname === "/mcp" || pathname === "/mcp/") candidates.push("mcp/index.html");
    candidates.push(pathname.replace(/^\//, "") + ".html");
    candidates.push(path.join(pathname.replace(/^\//, ""), "index.html"));

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(baseDir, candidate))) {
        return "/" + candidate.replace(/\\/g, "/") + (search ? "?" + search : "");
      }
    }
    return null;
  };

  const middleware = (server: ViteDevServer | PreviewServer, baseDir: string) => {
    server.middlewares.use((req, _res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const accept = req.headers.accept || "";
      if (!accept.includes("text/html")) return next();
      const target = resolve(req.url || "", baseDir);
      if (target) req.url = target;
      next();
    });
  };

  return {
    name: "koda-clean-urls",
    configureServer(server) {
      middleware(server, server.config.root);
    },
    configurePreviewServer(server) {
      middleware(server, path.resolve(server.config.root, server.config.build.outDir));
    },
  };
}

/**
 * Vercel added Web Analytics to the old static pages. The pages are Vite
 * entries now, so the same snippet is injected into every entry at build time.
 */
function vercelAnalytics(): Plugin {
  return {
    name: "koda-vercel-analytics",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "script",
          children: `window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`,
          injectTo: "head",
        },
        {
          tag: "script",
          attrs: { defer: true, src: "/_vercel/insights/script.js" },
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seoMetadata(), cleanUrls(), vercelAnalytics()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        HTML_ENTRIES.map((entry) => [
          entry === "index.html" ? "main" : entry.replace(/\.html$/, "").replace(/\//g, "-"),
          path.resolve(rootDir, entry),
        ]),
      ),
    },
  },
});
