import {
  safeImageUrl,
  validateKodaBaseDomain,
  validateKodaPort,
  validateKodaSubdomain,
  validateMinecraftUuid,
} from "./security.ts";

/** A row of rpc_get_servers_for_auth(). Databases come from the same call. */
export interface ServerRow {
  id?: string;
  host: string;
  server_version?: string;
  app_state?: string;
  app_last_ping?: string;
  ram_mb?: number;
  online_players?: number;
  max_players?: number;
  kodadash_port?: number;
  kodadash_token?: string;
  base_domain?: string;
  is_guest?: boolean;
  total_ram_mb?: number;
  free_ram_mb?: number;
  battery_level?: number | null;
  is_charging?: boolean;
  cpu_cores?: number;
  network_type?: string;
  device_model?: string;
  os_version?: string;
  screen_resolution?: string;
  app_version?: string;
}

export type StatusTone = "online" | "offline" | "pending";

export interface StatusDetails {
  label: string;
  tone: StatusTone;
}

/**
 * server_version doubles as the status channel: "OFFLINE|<version>", "HIBERNATED",
 * "DELETED" and "CMD:<action>" all travel through the same field.
 */
export function isOnline(version?: string | null): boolean {
  const raw = (version || "").trim();
  if (!raw) return false;
  return !(
    raw === "HIBERNATED" ||
    raw === "DELETED" ||
    raw.startsWith("OFFLINE") ||
    raw.startsWith("CMD:")
  );
}

export function versionLabel(version?: string | null): string {
  const raw = (version || "").replace(/^OFFLINE\|/, "").split(" | ")[0].trim();
  if (!raw || raw === "HIBERNATED" || raw === "DELETED" || raw.startsWith("CMD:")) return "Unknown";
  return raw;
}

export function getStatusDetails(version?: string | null): StatusDetails {
  const raw = (version || "").trim();
  if (raw.startsWith("CMD:")) return { label: "Command pending", tone: "pending" };
  if (raw === "DELETED") return { label: "Deleted", tone: "offline" };
  if (isOnline(raw)) return { label: "Online", tone: "online" };
  if (raw === "HIBERNATED") return { label: "Hibernated", tone: "offline" };
  return { label: "Offline", tone: "offline" };
}

/** Databases are rows of the same RPC, recognisable by their host / pending install. */
export function isDatabase(row: ServerRow): boolean {
  return (row.host || "").startsWith("db_") || row.server_version === "CMD:INSTALL_DB";
}

export function kodadashUrl(row: ServerRow, httpsEnabled: boolean): string {
  const host = validateKodaSubdomain(row.host);
  if (!host) return "";
  const baseDomain = validateKodaBaseDomain(row.base_domain);
  const token = row.kodadash_token ? "?token=" + encodeURIComponent(row.kodadash_token) : "";
  if (httpsEnabled) {
    return `https://${host}.${baseDomain}/${token}`;
  }
  const port = validateKodaPort(row.kodadash_port);
  if (!port) return "";
  return `http://${host}.${baseDomain}:${port}${token}`;
}

export interface AppStateDetails {
  badge: string;
  tone: StatusTone | "warn";
  description: string;
}

/** The app ping has to be fresh; 35 s without a report means offline. */
export function appStateDetails(state?: string, lastPing?: string): AppStateDetails | null {
  if (!state || !lastPing) return null;
  const age = (Date.now() - new Date(lastPing).getTime()) / 1000;
  if (!Number.isFinite(age) || age > 35) {
    return { badge: "OFFLINE", tone: "offline", description: "Not connected" };
  }
  if (state === "FOREGROUND") {
    return {
      badge: state,
      tone: "online",
      description: "KodaHosting App is active on your device",
    };
  }
  if (state === "BACKGROUND") {
    return {
      badge: state,
      tone: "warn",
      description: "App is running in the background",
    };
  }
  return { badge: state, tone: "offline", description: "Not connected" };
}

const DEVICE_NAMES: Record<string, string> = {
  "2512BPNDAC": "Xiaomi 17 Ultra",
  "2407FPN8EG": "Xiaomi 14T Pro",
  "2107113SG": "Xiaomi 11T Pro",
  CPH2797: "OPPO Find X9",
  "SM-A725F": "Galaxy A72",
  "SM-X510": "Galaxy Tab S9 FE",
};

export function deviceName(model?: string | null): string {
  if (!model) return "Android device";
  if (DEVICE_NAMES[model]) return DEVICE_NAMES[model];
  if (/^sdk_gphone/i.test(model)) return "Android emulator";
  return model;
}

const DEVICE_PHOTOS: Record<string, string> = {
  "2512BPNDAC": "/assets/devices/xiaomi-17-ultra.jpg",
  "Pixel 10 Pro": "/assets/devices/pixel-10-pro.jpg",
  CPH2797: "/assets/devices/oppo-find-x9.jpg",
  "2407FPN8EG": "/assets/devices/xiaomi-14t-pro.jpg",
};

export function devicePhoto(model?: string | null): string | null {
  if (!model) return null;
  return DEVICE_PHOTOS[model] || null;
}

export function deviceIsTablet(model?: string | null): boolean {
  const m = model || "";
  return m.startsWith("SM-X") || /tab/i.test(m);
}

export interface Me {
  email?: string;
  nickname?: string;
  avatar_url?: string;
  mc_uuid?: string;
  mc_username?: string;
  two_fa?: boolean;
  server_count?: number;
  device_count?: number;
  extension_count?: number;
  member_since?: string;
  linked_since?: string;
  /** "control" = created only to run servers shared by other people */
  account_type?: string | null;
}

export function avatarUrl(me: Me | null): string | null {
  if (!me) return null;
  const safeAvatar = safeImageUrl(me.avatar_url);
  if (safeAvatar) return safeAvatar;
  const safeUuid = validateMinecraftUuid(me.mc_uuid);
  if (safeUuid) return `https://crafatar.com/avatars/${encodeURIComponent(safeUuid)}?size=80&overlay`;
  return null;
}

export function avatarInitial(me: Me | null): string {
  return (me?.nickname || me?.email || "K").charAt(0).toUpperCase();
}
