export const SITE_URL = "https://host.kodanetwork.eu";
export const SITE_NAME = "KodaHosting";
export const DEFAULT_LOCALE = "en_US";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.jpg`;
export const DEFAULT_OG_IMAGE_ALT = "KodaHosting Android Minecraft server host";
export const DEFAULT_FAVICON = "/assets/logo.png";
export const DEFAULT_THEME_COLOR = "#000000";
export const DEFAULT_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";

export const HTML_ENTRIES = [
  "index.html",
  "store.html",
  "dashboard.html",
  "developer.html",
  "docs/index.html",
  "fdroid/index.html",
  "mcp/index.html",
  "invite.html",
  "reset.html",
  "privacy.html",
  "tos.html",
  "licenses.html",
  "impressum.html",
  "account-deletion.html",
  "data-deletion.html",
] as const;

export type HtmlEntryKey = (typeof HTML_ENTRIES)[number];

export interface SeoPageConfig {
  title: string;
  description?: string;
  canonicalPath?: string;
  robots: string;
  ogType?: "website" | "article";
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogLocale?: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  themeColor?: string;
  jsonLd?: Record<string, unknown>;
}

export interface SeoHtmlTag {
  tag: string;
  attrs?: Record<string, string | boolean>;
  children?: string;
  injectTo?: "head" | "head-prepend" | "body" | "body-prepend";
}

export const SEO_PAGES: Record<HtmlEntryKey, SeoPageConfig> = {
  "index.html": {
    title: "KodaHosting - Host a Real Minecraft Server on Your Android Phone",
    description:
      "KodaHosting runs a real Minecraft server on your Android phone with OpenJDK 8/17/21/25 and Rust cores, public reverse-proxy subdomains, browser console, and KodaDash MCP.",
    canonicalPath: "/",
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    ogType: "website",
    ogTitle: "KodaHosting - Host a Real Minecraft Server on Your Android Phone",
    ogDescription:
      "Run Paper, Purpur, Folia, Fabric, Forge, NeoForge, Vanilla, Velocity, or Pumpkin directly on your Android hardware with a public .kodaserv.eu address and browser dashboard.",
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    twitterCard: "summary_large_image",
    twitterTitle: "KodaHosting - Host a Real Minecraft Server on Your Android Phone",
    twitterDescription:
      "The Minecraft server process runs on your own Android phone. Friends join via a normal address with zero rented VPS.",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "KodaHosting",
          url: `${SITE_URL}/`,
          description:
            "Host a real Minecraft server directly on your Android phone with public reverse-proxy routing, browser console, extension store, and KodaDash MCP.",
        },
        {
          "@type": "Organization",
          name: "KodaNetwork",
          url: `${SITE_URL}/`,
          logo: DEFAULT_OG_IMAGE,
          sameAs: [
            "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost",
            `${SITE_URL}/fdroid`,
          ],
        },
        {
          "@type": "SoftwareApplication",
          name: "KodaHosting",
          operatingSystem: "Android 8.0+",
          applicationCategory: "GameApplication",
          url: `${SITE_URL}/`,
          downloadUrl: "https://play.google.com/store/apps/details?id=eu.kodanetwork.mchost",
          installUrl: `${SITE_URL}/fdroid`,
          image: DEFAULT_OG_IMAGE,
          description:
            "Android application that runs native ARM64 Minecraft servers (Paper, Purpur, Folia, Fabric, Forge, NeoForge, Vanilla, Velocity, Pumpkin) directly on your device with built-in reverse-proxy tunneling and browser dashboard.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Does KodaHosting actually run the Minecraft server on my Android phone?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. KodaHosting launches OpenJDK 8, 17, 21, or 25 (or native ARM64 Rust for Pumpkin) directly inside your Android phone. World data, plugins, mods, and logs stay on your own device storage.",
              },
            },
            {
              "@type": "Question",
              name: "Do I need port forwarding for friends to join my server?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. KodaHosting opens an outbound reverse-proxy tunnel to the DE Frankfurt relay and assigns a clean .kodaserv.eu hostname so friends can join without touching router settings or exposing your home IP.",
              },
            },
            {
              "@type": "Question",
              name: "Which Minecraft server engines are supported?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "KodaHosting supports Paper, Purpur, Folia, Fabric, Forge, NeoForge, official Mojang Vanilla, Velocity proxy, and the native Rust Pumpkin server.",
              },
            },
            {
              "@type": "Question",
              name: "How can I install KodaHosting on Android?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "You can install KodaHosting from Google Play or add the official KodaHosting F-Droid repository at https://host.kodanetwork.eu/fdroid.",
              },
            },
          ],
        },
      ],
    },
  },
  "store.html": {
    title: "KodaHosting Extension Store - Themes, Tools & Language Packs",
    description:
      "Browse verified KodaHosting extensions including language packs, themes, utilities, and interface add-ons for your Android Minecraft server.",
    canonicalPath: "/store",
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    ogType: "website",
    ogTitle: "KodaHosting Extension Store - Themes, Tools & Language Packs",
    ogDescription:
      "Browse verified language packs, themes, tools, and interface add-ons for KodaHosting.",
    twitterCard: "summary_large_image",
    twitterTitle: "KodaHosting Extension Store",
    twitterDescription:
      "Language packs, themes, tools, and interface add-ons for the KodaHosting Android Minecraft server host.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "KodaHosting Extension Store",
      url: `${SITE_URL}/store`,
      description: "Language packs, themes, tools, and interface add-ons for KodaHosting.",
    },
  },
  "docs/index.html": {
    title: "KodaHosting Documentation - Android Server Setup, Proxy & Extensions",
    description:
      "Official KodaHosting documentation covering Android setup, server engines, reverse-proxy networking, extensions, KodaDash MCP, and architecture.",
    canonicalPath: "/docs",
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    ogType: "article",
    ogTitle: "KodaHosting Documentation - Android Server Setup, Proxy & Extensions",
    ogDescription:
      "Learn how to configure Minecraft servers on Android, manage reverse-proxy subdomains, build extensions, and connect KodaDash MCP.",
    twitterCard: "summary_large_image",
    twitterTitle: "KodaHosting Documentation",
    twitterDescription:
      "Complete guide to running Minecraft servers on Android with KodaHosting.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "KodaHosting Documentation",
      url: `${SITE_URL}/docs`,
      description:
        "The KodaHosting documentation covering the Android app, server management, reverse-proxy connectivity, extensions, customization, and infrastructure.",
      publisher: {
        "@type": "Organization",
        name: "KodaNetwork",
        logo: DEFAULT_OG_IMAGE,
      },
    },
  },
  "fdroid/index.html": {
    title: "KodaHosting F-Droid Repository - Install on Android Without Google Play",
    description:
      "Add the official KodaHosting F-Droid repository on Android with verified SHA-256 fingerprint or download the signed APK directly.",
    canonicalPath: "/fdroid",
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    ogType: "website",
    ogTitle: "KodaHosting F-Droid Repository",
    ogDescription:
      "Install KodaHosting on Android through the official F-Droid repository or signed APK.",
    twitterCard: "summary_large_image",
    twitterTitle: "KodaHosting F-Droid Repository",
    twitterDescription:
      "Official F-Droid repository and signed APK download for KodaHosting on Android.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "KodaHosting (F-Droid)",
      operatingSystem: "Android 8.0+",
      applicationCategory: "GameApplication",
      url: `${SITE_URL}/fdroid`,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
    },
  },
  "mcp/index.html": {
    title: "KodaDash MCP Setup - Connect AI Clients to Your KodaHosting Server",
    description:
      "Inspect KodaDash MCP server permissions configured in the Android app and copy ready-to-use JSON or TOML configs for Claude Code, Cursor, Antigravity, VS Code, Windsurf, Codex, ZCode, and Claude Desktop.",
    canonicalPath: "/mcp",
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    ogType: "website",
    ogTitle: "KodaDash MCP Setup - KodaHosting",
    ogDescription:
      "Generate Model Context Protocol (MCP) JSON and TOML configurations for your KodaHosting Minecraft servers.",
    twitterCard: "summary_large_image",
    twitterTitle: "KodaDash MCP Setup - KodaHosting",
    twitterDescription:
      "Check server MCP status, review granted permissions, and copy ready-to-paste client configs.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "KodaDash MCP Setup",
      url: `${SITE_URL}/mcp`,
      description:
        "Configure Model Context Protocol (MCP) connections for KodaHosting Minecraft servers across Claude Code, Cursor, Antigravity, VS Code, Windsurf, Codex, ZCode, and Claude Desktop.",
    },
  },
  "privacy.html": {
    title: "KodaHosting | Privacy Policy",
    description:
      "How KodaHosting collects and processes personal data, which third parties are involved and which rights you have under the GDPR.",
    canonicalPath: "/privacy",
    robots: "index, follow",
    ogType: "website",
    ogDescription: "How KodaHosting collects and processes personal data under the GDPR.",
    twitterCard: "summary",
  },
  "tos.html": {
    title: "KodaHosting | Terms of Service",
    description:
      "The terms that apply to the KodaHosting app, the web dashboard, the extension store and the network.",
    canonicalPath: "/tos",
    robots: "index, follow",
    ogType: "website",
    ogDescription:
      "Terms of Service for the KodaHosting Android app, web dashboard, extension store, and relay network.",
    twitterCard: "summary",
  },
  "licenses.html": {
    title: "KodaHosting | Licenses",
    description:
      "The third-party licenses for everything that ships with KodaHosting: the app, the server engines, the tunnel and the site.",
    canonicalPath: "/licenses",
    robots: "index, follow",
    ogType: "website",
    ogDescription:
      "Third-party open-source licenses for KodaHosting, server engines, reverse-proxy tunnel, and website.",
    twitterCard: "summary",
  },
  "impressum.html": {
    title: "KodaHosting | Impressum",
    description: "Impressum and provider information for KodaHosting according to § 5 DDG.",
    canonicalPath: "/impressum",
    robots: "index, follow",
    ogType: "website",
    ogDescription: "Provider information and Impressum for KodaHosting according to § 5 DDG.",
    twitterCard: "summary",
  },
  "account-deletion.html": {
    title: "KodaHosting | Delete your account",
    description:
      "How to delete your KodaHosting account, which data is removed, what stays on your phone and what we must keep by law.",
    canonicalPath: "/account-deletion",
    robots: "index, follow",
    ogType: "website",
    ogDescription:
      "Instructions to delete your KodaHosting account and understand what data is removed.",
    twitterCard: "summary",
  },
  "data-deletion.html": {
    title: "KodaHosting | Delete your data",
    description:
      "How to delete some or all of your KodaHosting data without deleting your account.",
    canonicalPath: "/data-deletion",
    robots: "index, follow",
    ogType: "website",
    ogDescription: "How to remove KodaHosting data without deleting your account.",
    twitterCard: "summary",
  },
  "dashboard.html": {
    title: "KodaHosting | Dashboard",
    description: "Manage your KodaHosting servers, devices, extensions and support tickets.",
    robots: "noindex,nofollow",
    ogType: "website",
    twitterCard: "summary",
  },
  "developer.html": {
    title: "KodaHosting | Developer console",
    description:
      "Developer console for KodaHosting extensions: store listings, releases, review notes and a package editor in the browser.",
    robots: "noindex",
    ogType: "website",
    twitterCard: "summary",
  },
  "invite.html": {
    title: "KodaHosting | Server Invite",
    description: "A private invite to a Minecraft server hosted on KodaHosting.",
    robots: "noindex,nofollow",
    ogType: "website",
    twitterCard: "summary",
  },
  "reset.html": {
    title: "KodaHosting | Set a new password",
    description: "Set a new password for your KodaHosting account.",
    robots: "noindex,nofollow",
    ogType: "website",
    twitterCard: "summary",
  },
};

export function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * Safely serializes JSON-LD so script-closing sequences cannot escape an inline
 * <script type="application/ld+json"> block.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const ENTRY_LOOKUP = new Map<string, HtmlEntryKey>(
  HTML_ENTRIES.map((entry) => [entry.toLowerCase(), entry]),
);

/**
 * Resolves a Vite transformIndexHtml filename/path or clean URL into a known
 * HTML entry key in SEO_PAGES.
 */
export function resolveEntryKey(filenameOrPath: string): HtmlEntryKey | null {
  if (!filenameOrPath) return null;
  const cleaned = filenameOrPath
    .split("?")[0]
    .split("#")[0]
    .replace(/\\/g, "/");

  const direct = ENTRY_LOOKUP.get(cleaned.replace(/^\/+/, "").toLowerCase());
  if (direct) return direct;

  // Match nested sub-entry suffixes first (e.g. /abs/path/docs/index.html)
  const lower = cleaned.toLowerCase();
  const sortedEntries = [...HTML_ENTRIES].sort((a, b) => b.length - a.length);
  for (const entry of sortedEntries) {
    const suffix = `/${entry.toLowerCase()}`;
    if (lower.endsWith(suffix) || lower === entry.toLowerCase()) {
      return entry;
    }
  }

  // Fallback for clean URL paths like "/store", "/docs", "/"
  const trimmed = lower.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "index.html";
  if (ENTRY_LOOKUP.has(`${trimmed}.html`)) {
    return ENTRY_LOOKUP.get(`${trimmed}.html`) ?? null;
  }
  if (ENTRY_LOOKUP.has(`${trimmed}/index.html`)) {
    return ENTRY_LOOKUP.get(`${trimmed}/index.html`) ?? null;
  }
  return null;
}

/**
 * Builds the standardized set of head tags (title, favicon, description,
 * robots, theme-color, canonical, Open Graph, Twitter Card, JSON-LD, and
 * Google Fonts) for any KodaHosting HTML entry.
 */
export function buildSeoHeadTags(config: SeoPageConfig): SeoHtmlTag[] {
  const ogTitle = config.ogTitle ?? config.title;
  const ogDescription = config.ogDescription ?? config.description;
  const ogImage = toAbsoluteUrl(config.ogImage ?? DEFAULT_OG_IMAGE);
  const ogImageAlt = config.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT;
  const ogType = config.ogType ?? "website";
  const ogLocale = config.ogLocale ?? DEFAULT_LOCALE;
  const twitterCard = config.twitterCard ?? "summary_large_image";
  const twitterTitle = config.twitterTitle ?? ogTitle;
  const twitterDescription = config.twitterDescription ?? ogDescription;
  const twitterImage = toAbsoluteUrl(config.twitterImage ?? ogImage);
  const twitterImageAlt = config.twitterImageAlt ?? ogImageAlt;
  const canonicalUrl = config.canonicalPath ? toAbsoluteUrl(config.canonicalPath) : null;

  const tags: SeoHtmlTag[] = [
    { tag: "title", children: config.title, injectTo: "head" },
    {
      tag: "link",
      attrs: { rel: "icon", type: "image/png", href: DEFAULT_FAVICON },
      injectTo: "head",
    },
  ];

  if (config.description) {
    tags.push({
      tag: "meta",
      attrs: { name: "description", content: config.description },
      injectTo: "head",
    });
  }

  tags.push(
    {
      tag: "meta",
      attrs: { name: "robots", content: config.robots },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "theme-color", content: config.themeColor ?? DEFAULT_THEME_COLOR },
      injectTo: "head",
    },
  );

  if (canonicalUrl) {
    tags.push({
      tag: "link",
      attrs: { rel: "canonical", href: canonicalUrl },
      injectTo: "head",
    });
  }

  // Standardized Open Graph metadata
  tags.push(
    {
      tag: "meta",
      attrs: { property: "og:site_name", content: SITE_NAME },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:locale", content: ogLocale },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:type", content: ogType },
      injectTo: "head",
    },
  );

  if (canonicalUrl) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:url", content: canonicalUrl },
      injectTo: "head",
    });
  }

  tags.push({
    tag: "meta",
    attrs: { property: "og:title", content: ogTitle },
    injectTo: "head",
  });

  if (ogDescription) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:description", content: ogDescription },
      injectTo: "head",
    });
  }

  tags.push(
    {
      tag: "meta",
      attrs: { property: "og:image", content: ogImage },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:image:alt", content: ogImageAlt },
      injectTo: "head",
    },
  );

  // Standardized Twitter Card metadata
  tags.push(
    {
      tag: "meta",
      attrs: { name: "twitter:card", content: twitterCard },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "twitter:title", content: twitterTitle },
      injectTo: "head",
    },
  );

  if (twitterDescription) {
    tags.push({
      tag: "meta",
      attrs: { name: "twitter:description", content: twitterDescription },
      injectTo: "head",
    });
  }

  tags.push(
    {
      tag: "meta",
      attrs: { name: "twitter:image", content: twitterImage },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "twitter:image:alt", content: twitterImageAlt },
      injectTo: "head",
    },
  );

  if (config.jsonLd) {
    tags.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      children: serializeJsonLd(config.jsonLd),
      injectTo: "head",
    });
  }

  tags.push(
    {
      tag: "link",
      attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" },
      injectTo: "head",
    },
    {
      tag: "link",
      attrs: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: true },
      injectTo: "head",
    },
    {
      tag: "link",
      attrs: { href: DEFAULT_GOOGLE_FONTS_HREF, rel: "stylesheet" },
      injectTo: "head",
    },
  );

  return tags;
}

export interface SeoElementLike {
  setAttribute(name: string, value: string): void;
}

export interface SeoDocumentLike {
  title: string;
  head: {
    querySelector(selector: string): SeoElementLike | null;
    appendChild(node: SeoElementLike): unknown;
  } | null;
  createElement(tagName: string): SeoElementLike;
}

export interface RuntimeSeoOverrides {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

function upsertMetaTag(
  doc: SeoDocumentLike,
  attrName: "name" | "property",
  attrValue: string,
  content: string,
): void {
  if (!doc.head) return;
  let el = doc.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = doc.createElement("meta");
    el.setAttribute(attrName, attrValue);
    doc.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonicalLink(doc: SeoDocumentLike, href: string): void {
  if (!doc.head) return;
  let el = doc.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = doc.createElement("link");
    el.setAttribute("rel", "canonical");
    doc.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Updates active document title, Open Graph, Twitter, description, and
 * canonical tags at runtime when client-side filters change the page context.
 */
export function applyDocumentSeo(
  overrides: RuntimeSeoOverrides,
  targetDoc?: SeoDocumentLike | null,
): void {
  const doc =
    targetDoc !== undefined
      ? targetDoc
      : ((globalThis as unknown as { document?: SeoDocumentLike }).document ?? null);
  if (!doc) return;

  if (overrides.title) {
    doc.title = overrides.title;
  }

  const ogTitle = overrides.ogTitle ?? overrides.title;
  if (ogTitle) {
    upsertMetaTag(doc, "property", "og:title", ogTitle);
  }

  const twitterTitle = overrides.twitterTitle ?? ogTitle;
  if (twitterTitle) {
    upsertMetaTag(doc, "name", "twitter:title", twitterTitle);
  }

  if (overrides.description) {
    upsertMetaTag(doc, "name", "description", overrides.description);
  }

  const ogDescription = overrides.ogDescription ?? overrides.description;
  if (ogDescription) {
    upsertMetaTag(doc, "property", "og:description", ogDescription);
  }

  const twitterDescription = overrides.twitterDescription ?? ogDescription;
  if (twitterDescription) {
    upsertMetaTag(doc, "name", "twitter:description", twitterDescription);
  }

  if (overrides.canonicalPath) {
    const absUrl = toAbsoluteUrl(overrides.canonicalPath);
    upsertCanonicalLink(doc, absUrl);
    upsertMetaTag(doc, "property", "og:url", absUrl);
  }
}
