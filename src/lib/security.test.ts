import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeApiPath,
  isPrivateOrLocalHost,
  isSafeArchiveEntryPath,
  MAX_ARCHIVE_ENTRIES,
  safeExternalUrl,
  safeImageUrl,
  safeMinecraftFavicon,
  sanitizeUnpackedArchive,
  validateKodaBaseDomain,
  validateKodaPort,
  validateKodaSubdomain,
  validateMinecraftUuid,
} from "./security.ts";

test("safeExternalUrl blocks javascript:, data:, http:, credentials, and private IPs", () => {
  assert.equal(safeExternalUrl("javascript:alert(document.cookie)"), null);
  assert.equal(safeExternalUrl("  JaVaScRiPt:fetch('https://evil.tld')"), null);
  assert.equal(safeExternalUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeExternalUrl("http://github.com/libredroid-project/KodaNetwork"), null);
  assert.equal(safeExternalUrl("https://user:pass@example.com/path"), null);
  assert.equal(safeExternalUrl("https://169.254.169.254/latest/meta-data/"), null);
  assert.equal(safeExternalUrl("https://127.0.0.1/admin"), null);
  assert.equal(safeExternalUrl("https://[::1]/secret"), null);
  assert.equal(safeExternalUrl("https://2130706433/loopback"), null);
  assert.equal(
    safeExternalUrl("https://github.com/libredroid-project/KodaNetwork"),
    "https://github.com/libredroid-project/KodaNetwork",
  );
});

test("safeImageUrl allows public https images and safe /assets/ paths while blocking SVG data URIs", () => {
  assert.equal(safeImageUrl("/assets/app/dashboard.webp"), "/assets/app/dashboard.webp");
  assert.equal(safeImageUrl("/assets/../etc/passwd"), null);
  assert.equal(safeImageUrl("//evil.tld/logo.png"), null);
  assert.equal(safeImageUrl("data:image/svg+xml,<svg onload=alert(1)>"), null);
  assert.equal(
    safeImageUrl("https://cdn.kodanetwork.eu/icons/ext.webp"),
    "https://cdn.kodanetwork.eu/icons/ext.webp",
  );
});

test("safeMinecraftFavicon only permits bounded base64 PNG data URIs", () => {
  const valid = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  assert.equal(safeMinecraftFavicon(valid), valid);
  assert.equal(safeMinecraftFavicon("https://attacker.tld/track.png"), null);
  assert.equal(safeMinecraftFavicon("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(safeMinecraftFavicon("javascript:alert(1)"), null);
});

test("assertSafeApiPath prevents cross-origin Bearer token exfiltration", () => {
  const base = "https://api.kodanetwork.eu";
  assert.equal(assertSafeApiPath("/v1/me", base), "https://api.kodanetwork.eu/v1/me");
  assert.throws(() => assertSafeApiPath("//evil.tld/steal", base));
  assert.throws(() => assertSafeApiPath("https://evil.tld/steal", base));
  assert.throws(() => assertSafeApiPath("/\\evil.tld/steal", base));
  assert.throws(() => assertSafeApiPath("/v1/me\r\nX-Injected: 1", base));
});

test("KodaDash host, domain, port, and UUID validators reject injection payloads", () => {
  assert.equal(validateKodaSubdomain("survival-01"), "survival-01");
  assert.equal(validateKodaSubdomain("evil.com#@"), null);
  assert.equal(validateKodaSubdomain("../admin"), null);
  assert.equal(validateKodaBaseDomain("kodaserv.eu"), "kodaserv.eu");
  assert.equal(validateKodaBaseDomain("attacker.tld"), "kodanetwork.eu");
  assert.equal(validateKodaPort(25565), 25565);
  assert.equal(validateKodaPort(0), null);
  assert.equal(validateKodaPort(99999), null);
  assert.equal(validateMinecraftUuid("069a79f4-44e9-4726-a5be-fca90e38aaf5"), "069a79f4-44e9-4726-a5be-fca90e38aaf5");
  assert.equal(validateMinecraftUuid("../evil?x=1"), null);
});

test("isPrivateOrLocalHost catches IPv4, IPv6, and integer IP encodings", () => {
  assert.equal(isPrivateOrLocalHost("localhost"), true);
  assert.equal(isPrivateOrLocalHost("10.0.0.5"), true);
  assert.equal(isPrivateOrLocalHost("172.16.0.1"), true);
  assert.equal(isPrivateOrLocalHost("192.168.1.1"), true);
  assert.equal(isPrivateOrLocalHost("fd00::1"), true);
  assert.equal(isPrivateOrLocalHost("0x7f000001"), true);
  assert.equal(isPrivateOrLocalHost("api.kodanetwork.eu"), false);
});

test("sanitizeUnpackedArchive blocks traversal, prototype pollution, and entry floods", () => {
  assert.equal(isSafeArchiveEntryPath("manifest.json"), true);
  assert.equal(isSafeArchiveEntryPath("ui/index.html"), true);
  assert.equal(isSafeArchiveEntryPath("../escape.txt"), false);
  assert.equal(isSafeArchiveEntryPath("__proto__/polluted.js"), false);
  assert.equal(isSafeArchiveEntryPath("constructor/evil.js"), false);
  assert.equal(isSafeArchiveEntryPath("/etc/passwd"), false);

  assert.throws(() =>
    sanitizeUnpackedArchive({
      "../escape.txt": new Uint8Array([1, 2, 3]),
    }),
  );

  const many: Record<string, Uint8Array> = {};
  for (let i = 0; i <= MAX_ARCHIVE_ENTRIES; i++) {
    many[`f${i}.txt`] = new Uint8Array([1]);
  }
  assert.throws(() => sanitizeUnpackedArchive(many));
});
