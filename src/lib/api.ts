import { API_BASE, supabase } from "@/lib/supabase";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RateLimitHandler = (seconds: number) => void;

let rateLimitHandler: RateLimitHandler | null = null;

/** The blocking "service busy" screen is page specific, so pages register it. */
export function setRateLimitHandler(handler: RateLimitHandler | null) {
  rateLimitHandler = handler;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  const res = await fetch(API_BASE + path, { ...options, headers });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 401 && session) {
    // The stored session is dead (account deleted, token revoked) - drop it.
    await supabase.auth.signOut().catch(() => {});
  }
  if (res.status === 429) {
    rateLimitHandler?.(Number(body.retry_after) || 30);
  }
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : `HTTP ${res.status}`,
      res.status,
      typeof body.error === "string" ? body.error : undefined,
    );
  }
  return body as T;
}

/**
 * Public endpoints (catalog, status, invites) do not need a bearer. They still
 * get the same error shape, so callers only deal with one failure type.
 */
export async function publicApi<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + path, options);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 429) rateLimitHandler?.(Number(body.retry_after) || 30);
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : `HTTP ${res.status}`,
      res.status,
      typeof body.error === "string" ? body.error : undefined,
    );
  }
  return body as T;
}

/**
 * Signed upload URLs come from the API, never from user input. Refuse anything
 * that is not a plain https target on a public host before sending bytes there.
 */
export function assertSafeUploadUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("The upload target is not a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("The upload target must use https.");
  }
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith("169.254.") ||
    host.endsWith(".internal") ||
    host.endsWith(".local");
  if (blocked) {
    throw new Error("The upload target points to a private address.");
  }
}
