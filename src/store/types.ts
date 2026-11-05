export interface ExtensionVersion {
  version: string;
  version_code: number;
  released_at?: string;
  permissions?: string[];
  changelog?: string;
  file_size?: number;
  sha256?: string;
  min_app_version?: string;
}

export interface CatalogItem {
  ext_id: string;
  name: string;
  summary?: string;
  author?: string;
  category?: string;
  icon_url?: string;
  license?: string;
  downloads?: number;
  latest_version?: { version: string };
}

export interface ExtensionDetail extends CatalogItem {
  description?: string;
  source_url?: string;
  homepage_url?: string;
  screenshots?: string[];
  versions?: ExtensionVersion[];
}

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELISTED" | "WITHDRAWN";

export interface MyExtension {
  ext_id: string;
  name: string;
  status: SubmissionStatus;
  review_note?: string;
  downloads?: number;
  published_at?: string;
  ended_at?: string;
  versions?: { version: string; version_code?: number }[];
}

export interface StoreStatus {
  servers?: { total?: number; players_online?: number };
  extensions?: { published?: number };
  maintenance?: { active?: boolean; reason?: string };
}

export interface AssetUpload {
  upload: { signed_url: string };
  public_url: string;
}

export interface CreatedSubmission {
  upload: { signed_url: string };
}

export const CATEGORIES = [
  ["all", "All"],
  ["tools", "Tools"],
  ["ui", "Interface"],
  ["language", "Language packs"],
  ["theme", "Themes"],
  ["gameplay", "Gameplay"],
  ["other", "Other"],
] as const;

export const PERMISSIONS = [
  "storage",
  "servers.read",
  "console.read",
  "console.send",
  "servers.control",
  "players.read",
  "players.actions",
  "files.read",
  "notifications",
] as const;

export function statusBadgeClass(status: SubmissionStatus): string {
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

export function isEnded(status: SubmissionStatus): boolean {
  return status === "REJECTED" || status === "DELISTED" || status === "WITHDRAWN";
}
