export interface DeviceRow {
  app_uuid: string;
  model?: string;
  os?: string;
  app_version?: string;
  accounts?: { mc_username?: string; is_main?: boolean }[];
  total_ram_mb?: number;
  free_ram_mb?: number;
  battery?: number | null;
  charging?: boolean;
  last_ping?: string;
  app_state?: string;
}

export interface ExtensionItem {
  ext_id: string;
  name: string;
  author?: string;
  icon_url?: string;
  latest_version?: { version: string };
  downloads?: number;
  license?: string;
}

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELISTED" | "WITHDRAWN";

export interface MyExtensionItem {
  ext_id: string;
  name: string;
  status: SubmissionStatus;
  versions?: { version: string }[];
  downloads?: number;
  review_note?: string;
  ended_at?: string;
}

export type TicketStatus = "OPEN" | "CLOSE_REQUESTED" | "RESOLVED" | "CLOSED";

export interface TicketSummary {
  id: string | number;
  title: string;
  status: TicketStatus;
  ticket_type?: string;
  created_at?: string;
  last_message?: { is_admin?: boolean; message?: string };
}

export interface TicketMessage {
  is_admin?: boolean;
  message?: string;
  attachment_url?: string;
  created_at?: string;
}

export interface TicketDetail {
  id: string | number;
  title: string;
  status: TicketStatus;
  messages?: TicketMessage[];
}

export interface PlatformStatus {
  ok?: boolean;
  api?: { version?: string };
  servers?: { total?: number; players_online?: number };
  extensions?: { published?: number };
  vps?: {
    stale?: boolean;
    load1?: number;
    ram_used_pct?: number;
    open_tunnels?: number;
    uptime_seconds?: number;
  } | null;
  release?: { version_name?: string; channel?: string; published_at?: string } | null;
  maintenance?: { active?: boolean; reason?: string } | null;
}

export interface CommunityServer {
  host: string;
  domain?: string;
  status?: string;
  motd?: string;
  players_online?: number;
  players_max?: number;
  version?: string;
  gamemode?: string;
  owner?: { mc_username?: string };
  live?: {
    live?: boolean;
    favicon?: string;
    players_online?: number;
    players_max?: number;
    latency_ms?: number;
    motd?: string;
  };
}

export interface LicenseEntry {
  file: string;
  title: string;
  type: string;
}

export function ticketTone(status: TicketStatus): string {
  switch (status) {
    case "OPEN":
      return "tone-online";
    case "CLOSE_REQUESTED":
      return "tone-pending";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function submissionTone(status: SubmissionStatus): string {
  switch (status) {
    case "APPROVED":
      return "tone-online";
    case "PENDING":
      return "tone-pending";
    case "REJECTED":
    case "DELISTED":
      return "tone-danger";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}
