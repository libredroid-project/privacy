export type ApiFaultMode = "off" | "rate_limit" | "network_error";

export interface DebugSimulationState {
  mode: ApiFaultMode;
  retryAfter: number;
}

export interface RateLimitEventDetail {
  seconds: number;
  simulated: boolean;
}

const STORAGE_MODE_KEY = "koda_debug_api_mode";
const STORAGE_RETRY_KEY = "koda_debug_retry_after";

export const RATE_LIMIT_EVENT = "koda:ratelimit";
export const DEBUG_OPEN_EVENT = "koda:debug-open";
export const DEBUG_STATE_EVENT = "koda:debug-state";

export function normalizeCooldownSeconds(raw: number | string | null | undefined, fallback = 30): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(Math.round(parsed), 600));
}

export function normalizeFaultMode(raw: string | null | undefined): ApiFaultMode {
  if (raw === "rate_limit" || raw === "network_error") return raw;
  return "off";
}

export function parseDebugQueryParams(search: string): {
  openPanel: boolean;
  simulateSeconds: number | null;
  faultMode: ApiFaultMode | null;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const debugFlag = params.get("debug");
  const openPanel = debugFlag === "1" || debugFlag === "true" || params.has("debug");

  const simRaw = params.get("simulate_ratelimit") ?? params.get("ratelimit");
  const simulateSeconds =
    simRaw !== null && simRaw !== "" ? normalizeCooldownSeconds(simRaw, 15) : null;

  const faultRaw = params.get("fault");
  const faultMode =
    faultRaw === "rate_limit" || faultRaw === "network_error" || faultRaw === "off"
      ? faultRaw
      : null;

  return { openPanel, simulateSeconds, faultMode };
}

export function readDebugSimulationState(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined" ? window.sessionStorage : null,
): DebugSimulationState {
  if (!storage) return { mode: "off", retryAfter: 30 };
  try {
    const mode = normalizeFaultMode(storage.getItem(STORAGE_MODE_KEY));
    const retryAfter = normalizeCooldownSeconds(storage.getItem(STORAGE_RETRY_KEY), 30);
    return { mode, retryAfter };
  } catch {
    return { mode: "off", retryAfter: 30 };
  }
}

export function writeDebugSimulationState(
  next: DebugSimulationState,
  storage: Pick<Storage, "setItem" | "removeItem"> | null = typeof window !== "undefined"
    ? window.sessionStorage
    : null,
): DebugSimulationState {
  const normalized: DebugSimulationState = {
    mode: normalizeFaultMode(next.mode),
    retryAfter: normalizeCooldownSeconds(next.retryAfter, 30),
  };
  if (storage) {
    try {
      if (normalized.mode === "off") {
        storage.removeItem(STORAGE_MODE_KEY);
      } else {
        storage.setItem(STORAGE_MODE_KEY, normalized.mode);
      }
      storage.setItem(STORAGE_RETRY_KEY, String(normalized.retryAfter));
    } catch {
      // sessionStorage blocked
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<DebugSimulationState>(DEBUG_STATE_EVENT, { detail: normalized }));
  }
  return normalized;
}

export function resetDebugSimulation(
  storage: Pick<Storage, "setItem" | "removeItem"> | null = typeof window !== "undefined"
    ? window.sessionStorage
    : null,
): DebugSimulationState {
  return writeDebugSimulationState({ mode: "off", retryAfter: 30 }, storage);
}

export function dispatchRateLimitEvent(seconds: number, simulated = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RateLimitEventDetail>(RATE_LIMIT_EVENT, {
      detail: { seconds: normalizeCooldownSeconds(seconds, 30), simulated },
    }),
  );
}

export function openDebugOptionsPanel() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DEBUG_OPEN_EVENT));
}
