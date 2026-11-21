import { API_BASE, supabase } from "@/lib/supabase";
import {
  dispatchRateLimitEvent,
  readDebugSimulationState,
} from "@/lib/debug-ratelimit";
import { assertSafeApiPath, isPrivateOrLocalHost } from "@/lib/security";

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

/** Fires the active page rate-limit handler or global fallback overload dialog. */
export function triggerRateLimit(seconds: number, simulated = false) {
  if (rateLimitHandler && !simulated) {
    rateLimitHandler(seconds);
    return;
  }
  dispatchRateLimitEvent(seconds, simulated);
  if (!simulated) {
    rateLimitHandler?.(seconds);
  }
}

function checkDebugFault(path: string) {
  const sim = readDebugSimulationState();
  if (sim.mode === "rate_limit") {
    triggerRateLimit(sim.retryAfter, true);
    throw new ApiError(
      `HTTP 429: Too many requests from this IP (simulated debug block on ${path})`,
      429,
      "rate_limited",
    );
  }
  if (sim.mode === "network_error") {
    throw new ApiError(
      `NetworkError when attempting to fetch ${path} (simulated debug fault)`,
      503,
      "network_error",
    );
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  checkDebugFault(path);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  const url = assertSafeApiPath(path, API_BASE);
  const res = await fetch(url, { ...options, headers });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 401 && session) {
    // The stored session is dead (account deleted, token revoked) - drop it.
    await supabase.auth.signOut().catch(() => {});
  }
  if (res.status === 429) {
    triggerRateLimit(Number(body.retry_after) || 30, false);
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
  checkDebugFault(path);

  const url = assertSafeApiPath(path, API_BASE);
  const res = await fetch(url, options);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 429) triggerRateLimit(Number(body.retry_after) || 30, false);
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
  if (url.username || url.password) {
    throw new Error("The upload target must not contain credentials.");
  }
  if (isPrivateOrLocalHost(url.hostname)) {
    throw new Error("The upload target points to a private address.");
  }
}
