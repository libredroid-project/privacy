import { api, assertSafeUploadUrl } from "@/lib/api";
import type { DevExtension } from "@/developer/types";

/** fflate returns views that may not be backed by a plain ArrayBuffer. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface PublishOptions {
  version: string;
  versionCode: number;
  changelog?: string;
  permissions: string[];
  minAppVersion?: number;
}

/**
 * The one path every release takes: announce, upload to the signed target,
 * let the server verify hash, size and manifest. The listing fields travel
 * along because a fresh version re-enters the review.
 */
export async function publishVersion(
  ext: DevExtension,
  bytes: Uint8Array,
  options: PublishOptions,
): Promise<void> {
  if (!ext.license?.trim()) {
    throw new Error("Add a license in the store listing before publishing.");
  }

  const sha256 = await sha256Hex(bytes);
  const payload = {
    ext_id: ext.ext_id,
    name: ext.name,
    version: options.version,
    version_code: options.versionCode,
    min_app_version: options.minAppVersion ?? 0,
    license: ext.license,
    author: ext.author || null,
    summary: ext.summary || null,
    description: ext.description || null,
    category: ext.category || "other",
    homepage_url: ext.homepage_url || null,
    source_url: ext.source_url || null,
    icon_url: ext.icon_url || null,
    screenshots: ext.screenshots || [],
    changelog: options.changelog || null,
    permissions: options.permissions,
    sha256,
    file_size: bytes.byteLength,
  };

  const created = await api<{ upload: { signed_url: string } }>(
    `/v1/extensions/${encodeURIComponent(ext.ext_id)}/versions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  assertSafeUploadUrl(created.upload.signed_url);

  const put = await fetch(created.upload.signed_url, {
    method: "PUT",
    headers: { "Content-Type": "application/zip" },
    body: new Blob([toArrayBuffer(bytes)], { type: "application/zip" }),
  });
  if (!put.ok) throw new Error(`Package upload failed (${put.status}).`);

  await api(`/v1/extensions/${encodeURIComponent(ext.ext_id)}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version_code: options.versionCode }),
  });
}

export const PUBLISH_ERRORS: Record<string, string> = {
  email_not_verified:
    "Verify your e-mail first. The console has a verification card on the overview page.",
  too_many_pending_submissions:
    "You already have 3 submissions in review. Wait for the review before uploading more.",
  pending_version_exists:
    "This extension already has a version in review. Wait for the decision before the next release.",
  version_code_too_low: "The version code must be higher than the last submitted one.",
  sha256_mismatch: "The uploaded package did not match the announced hash. Try again.",
  file_size_mismatch: "The uploaded package changed on the way up. Try again.",
  manifest_id_mismatch: "manifest.json must contain the same id as the extension.",
  manifest_version_code_mismatch:
    "manifest.json has a different versionCode than the upload. The editor bumps it for you.",
  manifest_license_missing: "manifest.json needs a license field.",
  manifest_permission_unknown: "manifest.json lists a permission the app does not know.",
  invalid_package: "The package could not be read as a zip. Rebuild it and try again.",
  not_a_zip: "The uploaded file is not a zip.",
  upload_missing: "The upload did not arrive. Try again.",
};

export function publishErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return PUBLISH_ERRORS[message] || message;
}
