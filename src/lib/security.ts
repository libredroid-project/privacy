/**
 * Shared client-side security validators and sanitizers protecting KodaHosting
 * against unsafe URL schemes, token exfiltration, host/domain injection,
 * untrusted Minecraft server favicons, and malicious .kodaext ZIP archives.
 */

const ALLOWED_KODA_DOMAINS = new Set(["kodanetwork.eu", "kodaserv.eu"]);
const DNS_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const SAFE_PNG_DATA_URI_RE = /^data:image\/png;base64,[A-Za-z0-9+/=\s]{1,131072}$/;
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const MAX_ARCHIVE_COMPRESSED_BYTES = 20 * 1024 * 1024;
export const MAX_ARCHIVE_UNPACKED_BYTES = 64 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 2000;

/**
 * Returns true if the hostname points to a loopback, link-local, RFC1918 private,
 * metadata, or non-standard numeric IP target.
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;

  // Reject pure integer / hex / octal IPv4 shorthand encodings (e.g., 2130706433, 0x7f000001, 0177.0.0.1)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return true;
  if (/^0\d+\./.test(host)) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    host.startsWith("100.64.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:") ||
    host.startsWith("::ffff:127.") ||
    host.startsWith("::ffff:10.") ||
    host.startsWith("::ffff:192.168.") ||
    host.startsWith("::ffff:169.254.") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return true;
  }

  return false;
}

/**
 * Validates user- or API-supplied external links (source_url, homepage_url,
 * support ticket attachments). Strictly allows public https:// URLs without
 * embedded credentials. Returns null for javascript:, data:, http:, or private IPs.
 */
export function safeExternalUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (isPrivateOrLocalHost(parsed.hostname)) return null;

  return parsed.toString();
}

/**
 * Validates external or local image URLs (extension icons, screenshots, avatars).
 * Allows strict https:// public hosts or local /assets/ paths; blocks javascript:,
 * data:image/svg+xml, and unencrypted http:// URLs.
 */
export function safeImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  if (trimmed.startsWith("/assets/") && !trimmed.startsWith("//") && !trimmed.includes("..")) {
    return trimmed;
  }

  return safeExternalUrl(trimmed);
}

/**
 * Minecraft server list pings return a base64-encoded 64x64 PNG data URI.
 * Reject any external URL (prevents IP tracking beacons), SVG, or oversized payload.
 */
export function safeMinecraftFavicon(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!SAFE_PNG_DATA_URI_RE.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validates a relative API path before prepending API_BASE and attaching a
 * Supabase Bearer JWT, making protocol-relative (//evil.tld) or cross-origin
 * token exfiltration impossible.
 */
export function assertSafeApiPath(path: string, apiBase: string): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Refused unsafe API path.");
  }
  if (path.includes("\\") || /[\r\n]/.test(path)) {
    throw new Error("Refused malformed API path.");
  }

  const base = new URL(apiBase);
  const resolved = new URL(path, base);
  if (resolved.origin !== base.origin) {
    throw new Error("Refused cross-origin API request.");
  }
  return resolved.toString();
}

/**
 * Validates a KodaHosting subdomain label (e.g. "survival-smp").
 */
export function validateKodaSubdomain(host?: string | null): string | null {
  if (!host || typeof host !== "string") return null;
  const clean = host.trim().toLowerCase();
  if (!DNS_LABEL_RE.test(clean)) return null;
  return clean;
}

/**
 * Restricts KodaDash / MCP base domains strictly to KodaHosting owned zones.
 */
export function validateKodaBaseDomain(domain?: string | null): string {
  const clean = (domain || "kodanetwork.eu").trim().toLowerCase().replace(/\/+$/, "");
  if (ALLOWED_KODA_DOMAINS.has(clean)) return clean;
  return "kodanetwork.eu";
}

/**
 * Validates a TCP port number in 1..65535.
 */
export function validateKodaPort(port?: number | string | null): number | null {
  const num = Number(port);
  if (!Number.isInteger(num) || num < 1 || num > 65535) return null;
  return num;
}

/**
 * Validates a Minecraft UUID before interpolating it into an avatar URL.
 */
export function validateMinecraftUuid(uuid?: string | null): string | null {
  if (!uuid || typeof uuid !== "string") return null;
  const clean = uuid.trim();
  if (!UUID_RE.test(clean)) return null;
  return clean;
}

/**
 * Validates a ZIP entry path inside a .kodaext archive to block directory
 * traversal (../), absolute paths, backslashes, null bytes, and prototype
 * pollution keys (__proto__, constructor, prototype).
 */
export function isSafeArchiveEntryPath(rawPath: string): boolean {
  if (typeof rawPath !== "string") return false;
  if (!rawPath || rawPath.length > 240) return false;
  if (rawPath.startsWith("/") || rawPath.includes("\\") || rawPath.includes("\0")) return false;
  const parts = rawPath.split("/");
  for (const part of parts) {
    if (part === "" || part === "." || part === ".." || UNSAFE_OBJECT_KEYS.has(part)) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitizes an unpacked ZIP map while enforcing total file count and unpacked
 * memory ceilings to defend the browser editor against ZIP bombs and prototype
 * pollution.
 */
export function sanitizeUnpackedArchive(
  unpacked: Record<string, Uint8Array>,
): Record<string, Uint8Array> {
  const entries = Object.entries(unpacked);
  const safe: Record<string, Uint8Array> = Object.create(null);
  let fileCount = 0;
  let totalBytes = 0;

  for (const [entryPath, bytes] of entries) {
    if (entryPath.endsWith("/")) continue;
    if (!isSafeArchiveEntryPath(entryPath)) {
      throw new Error(`Refused unsafe path inside package: ${entryPath}`);
    }
    fileCount += 1;
    if (fileCount > MAX_ARCHIVE_ENTRIES) {
      throw new Error(`Package exceeds maximum allowed file count (${MAX_ARCHIVE_ENTRIES}).`);
    }
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_ARCHIVE_UNPACKED_BYTES) {
      throw new Error("Package exceeds maximum allowed unpacked size (64 MB).");
    }
    safe[entryPath] = bytes;
  }

  return safe;
}
