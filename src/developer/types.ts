export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELISTED" | "WITHDRAWN";

export interface DevVersion {
  version: string;
  version_code: number;
  min_app_version?: number | null;
  changelog?: string | null;
  permissions?: string[] | null;
  file_size?: number | null;
  sha256?: string | null;
  status: SubmissionStatus;
  review_note?: string | null;
  verified_at?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface DevExtension {
  ext_id: string;
  name: string;
  summary?: string | null;
  description?: string | null;
  category?: string | null;
  license?: string | null;
  author?: string | null;
  homepage_url?: string | null;
  source_url?: string | null;
  icon_url?: string | null;
  screenshots?: string[] | null;
  status: SubmissionStatus;
  review_note?: string | null;
  downloads: number;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  ended_at?: string | null;
  versions: DevVersion[];
}

export interface DeveloperMe {
  email?: string | null;
  email_verified?: boolean;
  member_since?: string | null;
  nickname?: string | null;
  mc_username?: string | null;
  servers?: number;
  extensions?: number;
}

export interface SourcePackage {
  version: string;
  version_code: number;
  sha256?: string | null;
  file_size?: number | null;
  url: string;
}

export function latestVersion(ext: DevExtension): DevVersion | undefined {
  return [...ext.versions].sort((a, b) => b.version_code - a.version_code)[0];
}

export function pendingVersion(ext: DevExtension): DevVersion | undefined {
  return ext.versions.find((version) => version.status === "PENDING");
}

export function isEnded(status: SubmissionStatus): boolean {
  return status === "REJECTED" || status === "DELISTED" || status === "WITHDRAWN";
}

export function statusTone(status: SubmissionStatus): string {
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

/** an approved extension with a version in review shows that, not just APPROVED. */
export function displayStatus(ext: DevExtension): string {
  return pendingVersion(ext) ? "IN REVIEW" : ext.status;
}

export function displayStatusTone(ext: DevExtension): string {
  return pendingVersion(ext) ? "tone-pending" : statusTone(ext.status);
}

export const CATEGORIES = [
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

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
