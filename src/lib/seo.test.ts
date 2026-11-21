import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDocumentSeo,
  buildSeoHeadTags,
  HTML_ENTRIES,
  resolveEntryKey,
  SEO_PAGES,
  serializeJsonLd,
  SITE_URL,
  type SeoDocumentLike,
  type SeoElementLike,
} from "./seo.ts";

test("resolveEntryKey maps Vite paths, absolute paths, and clean URLs for all 15 entries", () => {
  for (const entry of HTML_ENTRIES) {
    assert.equal(resolveEntryKey(entry), entry);
    assert.equal(resolveEntryKey(`/${entry}`), entry);
    assert.equal(resolveEntryKey(`/workspace/project/${entry}`), entry);
    assert.equal(resolveEntryKey(`C:\\repo\\${entry.replace(/\//g, "\\")}`), entry);
  }

  assert.equal(resolveEntryKey("/"), "index.html");
  assert.equal(resolveEntryKey("/store"), "store.html");
  assert.equal(resolveEntryKey("/docs"), "docs/index.html");
  assert.equal(resolveEntryKey("/docs/"), "docs/index.html");
  assert.equal(resolveEntryKey("/fdroid"), "fdroid/index.html");
  assert.equal(resolveEntryKey("/mcp"), "mcp/index.html");
  assert.equal(resolveEntryKey("/store?author=koda"), "store.html");
  assert.equal(resolveEntryKey("/does-not-exist"), null);
});

test("every HTML entry builds standardized Open Graph, Twitter, robots, and font tags", () => {
  for (const entry of HTML_ENTRIES) {
    const config = SEO_PAGES[entry];
    const tags = buildSeoHeadTags(config);

    const titleTag = tags.find((t) => t.tag === "title");
    assert.ok(titleTag?.children, `Missing title on ${entry}`);
    assert.equal(titleTag?.children?.includes("\u2014"), false, `Em-dash in title on ${entry}`);

    const metaByName = (name: string) =>
      tags.find((t) => t.tag === "meta" && t.attrs?.name === name)?.attrs?.content;
    const metaByProp = (prop: string) =>
      tags.find((t) => t.tag === "meta" && t.attrs?.property === prop)?.attrs?.content;

    assert.equal(metaByProp("og:site_name"), "KodaHosting");
    assert.equal(metaByProp("og:locale"), "en_US");
    assert.ok(metaByProp("og:type"), `Missing og:type on ${entry}`);
    assert.ok(metaByProp("og:title"), `Missing og:title on ${entry}`);
    assert.ok(metaByProp("og:image"), `Missing og:image on ${entry}`);
    assert.ok(metaByProp("og:image:alt"), `Missing og:image:alt on ${entry}`);

    assert.ok(metaByName("twitter:card"), `Missing twitter:card on ${entry}`);
    assert.ok(metaByName("twitter:title"), `Missing twitter:title on ${entry}`);
    assert.ok(metaByName("twitter:image"), `Missing twitter:image on ${entry}`);
    assert.ok(metaByName("twitter:image:alt"), `Missing twitter:image:alt on ${entry}`);
    assert.equal(metaByName("robots"), config.robots);

    const canonical = tags.find((t) => t.tag === "link" && t.attrs?.rel === "canonical");
    if (config.canonicalPath) {
      assert.equal(canonical?.attrs?.href, `${SITE_URL}${config.canonicalPath}`);
      assert.equal(metaByProp("og:url"), `${SITE_URL}${config.canonicalPath}`);
    } else {
      assert.equal(canonical, undefined, `Noindex page ${entry} should not emit canonical`);
      assert.equal(metaByProp("og:url"), undefined, `Noindex page ${entry} should not emit og:url`);
    }

    const jsonLdTag = tags.find(
      (t) => t.tag === "script" && t.attrs?.type === "application/ld+json",
    );
    if (config.jsonLd) {
      assert.ok(jsonLdTag?.children, `Missing JSON-LD children on ${entry}`);
      assert.doesNotThrow(() => JSON.parse(jsonLdTag!.children!));
    }
  }
});

test("serializeJsonLd escapes script breakout characters safely", () => {
  const payload = serializeJsonLd({
    name: "</script><script>alert(1)</script>",
    ampersand: "A & B",
  });
  assert.equal(payload.includes("</script>"), false);
  assert.equal(payload.includes("<"), false);
  assert.equal(payload.includes(">"), false);
  assert.deepEqual(JSON.parse(payload), {
    name: "</script><script>alert(1)</script>",
    ampersand: "A & B",
  });
});

test("applyDocumentSeo updates title, OG, Twitter, description, and canonical tags cleanly", () => {
  const store = new Map<string, Record<string, string>>();
  const makeNode = (tagName: string): SeoElementLike => {
    const attrs: Record<string, string> = { __tag: tagName };
    return {
      setAttribute(name: string, value: string) {
        attrs[name] = value;
        const key =
          tagName === "meta"
            ? attrs.name
              ? `meta[name="${attrs.name}"]`
              : attrs.property
                ? `meta[property="${attrs.property}"]`
                : ""
            : tagName === "link" && attrs.rel
              ? `link[rel="${attrs.rel}"]`
              : "";
        if (key) store.set(key, attrs);
      },
    };
  };

  const mockDoc: SeoDocumentLike = {
    title: "",
    head: {
      querySelector(selector: string) {
        const existing = store.get(selector);
        if (!existing) return null;
        return {
          setAttribute(name: string, value: string) {
            existing[name] = value;
          },
        };
      },
      appendChild() {
        return null;
      },
    },
    createElement: makeNode,
  };

  applyDocumentSeo(
    {
      title: "KodaDev | KodaHosting Extension Store",
      description: "Extensions published by KodaDev on KodaHosting.",
      canonicalPath: "/store",
    },
    mockDoc,
  );

  assert.equal(mockDoc.title, "KodaDev | KodaHosting Extension Store");
  assert.equal(store.get('meta[property="og:title"]')?.content, "KodaDev | KodaHosting Extension Store");
  assert.equal(store.get('meta[name="twitter:title"]')?.content, "KodaDev | KodaHosting Extension Store");
  assert.equal(
    store.get('meta[name="description"]')?.content,
    "Extensions published by KodaDev on KodaHosting.",
  );
  assert.equal(store.get('link[rel="canonical"]')?.href, `${SITE_URL}/store`);
  assert.equal(store.get('meta[property="og:url"]')?.content, `${SITE_URL}/store`);
});
