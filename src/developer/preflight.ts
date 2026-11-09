import { PERMISSIONS, type DevExtension } from "@/developer/types";

export type CheckLevel = "pass" | "warn" | "fail";

export interface Check {
  id: string;
  group: string;
  title: string;
  detail: string;
  level: CheckLevel;
}

export interface PreflightOptions {
  version: string;
  versionCode: number;
  changelog: string;
  permissions: string[];
  minAppVersion: number;
}

export interface PreflightReport {
  checks: Check[];
  fails: number;
  warns: number;
  passes: number;
  ok: boolean;
}

const VERSION_PATTERN = /^[0-9]+(\.[0-9]+)*$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EXECUTABLE_EXT = /\.(apk|dex|so|dll|exe|bat|cmd|msi|scr|jar)$/i;
const TEXT_EXT = /\.(json|js|mjs|cjs|jsx|ts|tsx|css|html?|svg|md|txt|xml|ya?ml|java|kt|properties|sh|toml|ini|csv)$/i;

function decodeText(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function looksExecutable(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const [a, b, c, d] = bytes;
  const elf = a === 0x7f && b === 0x45 && c === 0x4c && d === 0x46;
  const pe = a === 0x4d && b === 0x5a;
  const dex = a === 0x64 && b === 0x65 && c === 0x78 && d === 0x0a;
  const macho = (a === 0xfe && (b === 0xed || b === 0xfa)) || (a === 0xcf && b === 0xfa);
  return elf || pe || dex || macho;
}

function checkManifestPath(files: Record<string, Uint8Array>): string | null {
  return Object.keys(files).find((path) => path === "manifest.json")
    ?? Object.keys(files).find((path) => path.endsWith("/manifest.json"))
    ?? null;
}

function localReferences(html: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
    /<source[^>]+src=["']([^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1].trim();
      if (!raw || /^(https?:|data:|#|mailto:|\/\/)/i.test(raw)) continue;
      refs.add(raw.replace(/^\.\//, "").split("?")[0].split("#")[0]);
    }
  }
  return [...refs];
}

/**
 * The checks a package has to survive before it goes to review. They mirror what
 * the API verifies during finalize, plus the store listing and security checks
 * that only make sense in the console.
 */
export function runPreflight(
  ext: DevExtension,
  files: Record<string, Uint8Array>,
  options: PreflightOptions,
): PreflightReport {
  const checks: Check[] = [];
  const add = (id: string, group: string, title: string, detail: string, level: CheckLevel) => {
    checks.push({ id, group, title, detail, level });
  };

  const paths = Object.keys(files);
  const manifestPath = checkManifestPath(files);
  let manifest: Record<string, unknown> | null = null;
  let manifestError = "";

  if (!paths.length) {
    add("package.empty", "Package", "Package has files", "The package is empty.", "fail");
  } else {
    add("package.files", "Package", "Package has files", `${paths.length} file${paths.length === 1 ? "" : "s"} found.`, "pass");
  }

  if (!manifestPath) {
    add("manifest.present", "Manifest", "manifest.json exists", "A .kodaext package needs manifest.json in the package.", "fail");
  } else {
    add("manifest.present", "Manifest", "manifest.json exists", `Found ${manifestPath}.`, "pass");
    const text = decodeText(files[manifestPath]);
    if (text == null) {
      manifestError = "manifest.json is not valid UTF-8.";
    } else {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          manifest = parsed as Record<string, unknown>;
        } else {
          manifestError = "manifest.json must contain a JSON object.";
        }
      } catch (error) {
        manifestError = `manifest.json is not valid JSON: ${(error as Error).message}`;
      }
    }
    add(
      "manifest.json",
      "Manifest",
      "manifest.json is valid JSON",
      manifest ? "The manifest could be parsed." : manifestError,
      manifest ? "pass" : "fail",
    );
  }

  const base = manifestPath && manifestPath.includes("/")
    ? manifestPath.slice(0, manifestPath.lastIndexOf("/") + 1)
    : "";
  const hasFile = (rel: string) => Boolean(files[base + rel] || files[rel]);
  const readJson = (rel: string): unknown | null => {
    const bytes = files[base + rel] || files[rel];
    if (!bytes) return null;
    const text = decodeText(bytes);
    if (text == null) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  if (manifest) {
    const m = manifest as Record<string, any>;
    add(
      "manifest.schema",
      "Manifest",
      "Schema is supported",
      m.schema == null || Number(m.schema) === 1 ? "Schema 1." : `Schema ${m.schema} is not supported by this app version.`,
      m.schema == null || Number(m.schema) === 1 ? "pass" : "fail",
    );
    add(
      "manifest.id",
      "Manifest",
      "Id matches the extension",
      typeof m.id === "string" && m.id === ext.ext_id
        ? `Id ${ext.ext_id} matches.`
        : `manifest id is ${m.id ?? "missing"}, the extension is ${ext.ext_id}.`,
      typeof m.id === "string" && m.id === ext.ext_id ? "pass" : "fail",
    );
    add(
      "manifest.version",
      "Manifest",
      "Version matches the release",
      m.version === options.version
        ? `Version ${options.version}.`
        : `manifest says ${m.version ?? "nothing"}, the form says ${options.version}.`,
      m.version === options.version && VERSION_PATTERN.test(String(m.version)) ? "pass" : "fail",
    );
    add(
      "manifest.version_code",
      "Manifest",
      "Version code matches the release",
      Number(m.versionCode) === options.versionCode
        ? `Version code ${options.versionCode}.`
        : `manifest says ${m.versionCode ?? "nothing"}, the form says ${options.versionCode}.`,
      Number(m.versionCode) === options.versionCode ? "pass" : "fail",
    );
    add(
      "manifest.name",
      "Manifest",
      "Name is usable",
      typeof m.name === "string" && m.name.trim().length >= 2 && m.name.length <= 48
        ? `"${m.name}" (${m.name.length}/48).`
        : "The name must be between 2 and 48 characters.",
      typeof m.name === "string" && m.name.trim().length >= 2 && m.name.length <= 48 ? "pass" : "fail",
    );
    add(
      "manifest.license",
      "Manifest",
      "License is declared",
      typeof m.license === "string" && m.license.trim() && m.license.length <= 64
        ? m.license
        : "Every extension needs a license in the manifest and in the store listing.",
      typeof m.license === "string" && m.license.trim() && m.license.length <= 64 ? "pass" : "fail",
    );

    const manifestPermissions = Array.isArray(m.permissions) ? m.permissions.filter((item: unknown) => typeof item === "string") : [];
    const unknown = manifestPermissions.filter((item: string) => !PERMISSIONS.includes(item as (typeof PERMISSIONS)[number]));
    add(
      "manifest.permissions_known",
      "Manifest",
      "Permissions are known",
      unknown.length ? `Unknown permissions: ${unknown.join(", ")}.` : "All permissions exist in the runtime.",
      unknown.length ? "fail" : "pass",
    );
    const same =
      manifestPermissions.length === options.permissions.length &&
      manifestPermissions.every((item: string) => options.permissions.includes(item));
    add(
      "manifest.permissions_sync",
      "Manifest",
      "Permissions match the release",
      same
        ? "The manifest and the release form request the same permissions."
        : `manifest: [${manifestPermissions.join(", ") || "none"}], release form: [${options.permissions.join(", ") || "none"}].`,
      same ? "pass" : "fail",
    );

    const minApp = Number(m.minAppVersion ?? 0);
    add(
      "manifest.min_app",
      "Manifest",
      "Minimum app version is sane",
      Number.isFinite(minApp) && minApp >= 0
        ? minApp === 0
          ? "0, so every app build can load it."
          : `Requires app build ${minApp}. Make sure that build is released.`
        : "minAppVersion must be a positive number or 0.",
      Number.isFinite(minApp) && minApp >= 0 ? (minApp > 0 ? "warn" : "pass") : "fail",
    );
    add(
      "manifest.min_app_sync",
      "Manifest",
      "Minimum app version matches the release",
      minApp === options.minAppVersion
        ? `Both say ${minApp}.`
        : `manifest says ${minApp}, the release form says ${options.minAppVersion}.`,
      minApp === options.minAppVersion ? "pass" : "fail",
    );
    add(
      "manifest.description",
      "Manifest",
      "Description is present",
      typeof m.description === "string" && m.description.trim().length >= 10
        ? `${m.description.length}/600 characters.`
        : "Add a short description to manifest.json (at least 10 characters).",
      typeof m.description === "string" && m.description.trim().length >= 10 ? "pass" : "warn",
    );

    if (typeof m.ui?.entry === "string" && m.ui.entry.trim()) {
      add(
        "files.ui_entry",
        "Files",
        "UI entry exists",
        hasFile(m.ui.entry) ? `${m.ui.entry} is in the package.` : `${m.ui.entry} is declared but missing.`,
        hasFile(m.ui.entry) ? "pass" : "fail",
      );
      const html = files[base + m.ui.entry] || files[m.ui.entry];
      if (html) {
        const text = decodeText(html);
        if (text && /\.html?$/i.test(m.ui.entry)) {
          const dir = m.ui.entry.split("/").slice(0, -1).join("/");
          const missing = localReferences(text).filter(
            (ref) => !ref.includes("..") && !hasFile(ref) && !hasFile(dir ? `${dir}/${ref}` : ref),
          );
          add(
            "files.ui_assets",
            "Files",
            "UI assets are in the package",
            missing.length ? `Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}` : "All local references resolve.",
            missing.length ? "warn" : "pass",
          );
        }
      }
    }
    if (typeof m.icon === "string" && m.icon.trim()) {
      add(
        "files.icon",
        "Files",
        "Manifest icon exists",
        hasFile(m.icon) ? `${m.icon} is in the package.` : `${m.icon} is declared but missing.`,
        hasFile(m.icon) ? "pass" : "fail",
      );
    }
    if (typeof m.automations === "string" && m.automations.trim()) {
      const exists = hasFile(m.automations) && m.automations.toLowerCase().endsWith(".json");
      const parsed = exists ? readJson(m.automations) : null;
      add(
        "files.automations",
        "Files",
        "Automations file is valid",
        !exists ? `${m.automations} is missing or not a .json file.` : parsed == null ? "The automations file is not valid JSON." : "Automations can be parsed.",
        exists && parsed != null ? "pass" : "fail",
      );
    }

    const languages = Array.isArray(m.contributes?.languages) ? m.contributes.languages : [];
    const badLanguages = languages.filter((entry: any) => !entry || typeof entry.file !== "string" || !hasFile(entry.file) || readJson(entry.file) == null);
    if (languages.length) {
      add(
        "files.languages",
        "Files",
        "Language packs are valid",
        badLanguages.length ? `${badLanguages.length} language file(s) are missing or broken.` : `${languages.length} language file(s) parse.`,
        badLanguages.length ? "fail" : "pass",
      );
    }

    const themes = Array.isArray(m.contributes?.themes) ? m.contributes.themes : [];
    const badThemes = themes.filter((entry: any) => {
      if (!entry || typeof entry.id !== "string") return true;
      if (typeof entry.color !== "string" || !COLOR_PATTERN.test(entry.color)) return true;
      if (entry.colors && typeof entry.colors === "object") {
        return Object.values(entry.colors).some((value) => typeof value !== "string" || !COLOR_PATTERN.test(value as string));
      }
      return false;
    });
    if (themes.length) {
      add(
        "files.themes",
        "Files",
        "Theme colours are valid",
        badThemes.length ? `${badThemes.length} theme(s) have a missing or invalid colour.` : `${themes.length} theme(s) use #RRGGBB colours.`,
        badThemes.length ? "fail" : "pass",
      );
    }

    const tabs = Array.isArray(m.contributes?.server_tabs) ? m.contributes.server_tabs : [];
    const badTabs = tabs.filter((entry: any) => {
      const target = typeof entry?.entry === "string" && entry.entry.trim()
        ? entry.entry
        : (typeof m.ui?.entry === "string" ? m.ui.entry : null);
      return target && !hasFile(target);
    });
    if (tabs.length) {
      add(
        "files.server_tabs",
        "Files",
        "Server tab pages exist",
        badTabs.length ? `${badTabs.length} server tab(s) point to a missing page.` : `${tabs.length} server tab(s) resolve.`,
        badTabs.length ? "fail" : "pass",
      );
    }
  }

  // ---- package hygiene -----------------------------------------------------
  const total = paths.reduce((sum, path) => sum + (files[path]?.byteLength ?? 0), 0);
  add(
    "package.size",
    "Package",
    "Package size",
    `${(total / (1024 * 1024)).toFixed(2)} MB uncompressed, limit is ${MAX_PACKAGE_BYTES / (1024 * 1024)} MB compressed.`,
    total > MAX_PACKAGE_BYTES || total > MAX_UNPACKED_BYTES ? "fail" : total > 8 * 1024 * 1024 ? "warn" : "pass",
  );
  add(
    "package.count",
    "Package",
    "File count",
    `${paths.length} files, limit is 2000.`,
    paths.length > 2000 ? "fail" : paths.length > 400 ? "warn" : "pass",
  );

  const unsafe = paths.filter((path) => {
    const parts = path.split("/");
    return path.startsWith("/") || path.includes("\\") || path.length > 200 || parts.some((part) => part === ".." || part === "." || part === "");
  });
  add(
    "package.paths",
    "Package",
    "Paths stay inside the package",
    unsafe.length ? `Unsafe: ${unsafe.slice(0, 5).join(", ")}` : "No absolute paths, backslashes or .. segments.",
    unsafe.length ? "fail" : "pass",
  );

  const executables = paths.filter((path) => EXECUTABLE_EXT.test(path) || looksExecutable(files[path]));
  add(
    "package.executables",
    "Security",
    "No native executables",
    executables.length
      ? `Remove native code: ${executables.slice(0, 5).join(", ")}. Extensions run in the app sandbox.`
      : "No .apk, .dex, .so, .dll, .exe or native binaries found.",
    executables.length ? "fail" : "pass",
  );

  const bigFiles = paths.filter((path) => (files[path]?.byteLength ?? 0) > MAX_FILE_BYTES);
  add(
    "package.file_size",
    "Package",
    "Single files stay small",
    bigFiles.length ? `${bigFiles.length} file(s) are over 5 MB: ${bigFiles.slice(0, 3).join(", ")}.` : "No file is over 5 MB.",
    bigFiles.length ? "fail" : "pass",
  );

  // ---- code hygiene --------------------------------------------------------
  const textFiles = paths.filter((path) => TEXT_EXT.test(path) && (files[path]?.byteLength ?? 0) < 512 * 1024);
  let invalidJson = 0;
  for (const path of textFiles.filter((item) => item.toLowerCase().endsWith(".json"))) {
    if (readJson(path.replace(base, "")) == null) invalidJson += 1;
  }
  add(
    "code.json",
    "Code",
    "Every .json file parses",
    invalidJson ? `${invalidJson} JSON file(s) are broken.` : `${textFiles.filter((item) => item.toLowerCase().endsWith(".json")).length} JSON file(s) checked.`,
    invalidJson ? "fail" : "pass",
  );

  let secrets = 0;
  let privateKey = false;
  let localUrls = 0;
  for (const path of textFiles) {
    const text = decodeText(files[path]);
    if (!text) continue;
    if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) privateKey = true;
    if (/(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})/.test(text)) secrets += 1;
    if (/(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)/.test(text)) localUrls += 1;
  }
  add(
    "security.secrets",
    "Security",
    "No credentials in the package",
    privateKey
      ? "A private key is inside the package. Remove it before publishing."
      : secrets
        ? `${secrets} file(s) contain something that looks like an API token.`
        : "No obvious keys or tokens found.",
    privateKey ? "fail" : secrets ? "warn" : "pass",
  );
  add(
    "security.local_urls",
    "Security",
    "No localhost or private network URLs",
    localUrls ? `${localUrls} file(s) point to localhost or a private address.` : "No local addresses found.",
    localUrls ? "warn" : "pass",
  );

  add(
    "package.readme",
    "Package",
    "README is included",
    paths.some((path) => /(^|\/)readme(\.md|\.txt)?$/i.test(path))
      ? "A README is in the package."
      : "Add a short README so users know how to use the extension.",
    paths.some((path) => /(^|\/)readme(\.md|\.txt)?$/i.test(path)) ? "pass" : "warn",
  );

  // ---- release + store listing --------------------------------------------
  add(
    "release.code_higher",
    "Release",
    "Version code is higher",
    `New code ${options.versionCode}, latest published code ${Math.max(0, ...ext.versions.map((item) => item.version_code))}.`,
    options.versionCode > Math.max(0, ...ext.versions.map((item) => item.version_code)) ? "pass" : "fail",
  );
  add(
    "release.changelog",
    "Release",
    "Changelog is filled",
    options.changelog.trim().length >= 10
      ? `${options.changelog.trim().length}/4000 characters.`
      : "Write what changed, users see it with the update.",
    options.changelog.trim().length >= 10 ? "pass" : "warn",
  );
  add(
    "release.version_name",
    "Release",
    "Version name is valid",
    VERSION_PATTERN.test(options.version)
      ? options.version
      : "Use a version like 1.2.0 (digits and dots only).",
    VERSION_PATTERN.test(options.version) ? "pass" : "fail",
  );
  add(
    "release.min_app",
    "Release",
    "Minimum app version",
    options.minAppVersion > 0
      ? `Only app builds from ${options.minAppVersion} can install the update.`
      : "0, every app build can install it.",
    "pass",
  );

  add(
    "listing.name",
    "Store listing",
    "Store name",
    ext.name.trim().length >= 2 ? ext.name : "The store listing needs a name.",
    ext.name.trim().length >= 2 ? "pass" : "fail",
  );
  add(
    "listing.summary",
    "Store listing",
    "Short description",
    (ext.summary || "").trim().length >= 20
      ? `${ext.summary!.trim().length}/200 characters.`
      : "Add a short description with at least 20 characters.",
    (ext.summary || "").trim().length >= 20 ? "pass" : "warn",
  );
  add(
    "listing.description",
    "Store listing",
    "Description",
    (ext.description || "").trim().length >= 80
      ? `${ext.description!.trim().length}/6000 characters.`
      : "A description under 80 characters rarely explains an extension.",
    (ext.description || "").trim().length >= 80 ? "pass" : "warn",
  );
  add(
    "listing.license",
    "Store listing",
    "License",
    (ext.license || "").trim() ? ext.license! : "Set a license in the store listing.",
    (ext.license || "").trim() ? "pass" : "fail",
  );
  add(
    "listing.icon",
    "Store listing",
    "Store icon",
    ext.icon_url ? "Icon uploaded." : "Upload a store icon, otherwise the first letter is shown.",
    ext.icon_url ? "pass" : "warn",
  );
  const shots = ext.screenshots?.length || 0;
  add(
    "listing.screenshots",
    "Store listing",
    "Screenshots",
    shots > 0 ? `${shots}/6 screenshots.` : "Add at least one screenshot of the extension.",
    shots > 0 ? "pass" : "warn",
  );

  const order: Record<CheckLevel, number> = { fail: 0, warn: 1, pass: 2 };
  checks.sort((a, b) => (a.group === b.group ? order[a.level] - order[b.level] : 0));

  const fails = checks.filter((check) => check.level === "fail").length;
  const warns = checks.filter((check) => check.level === "warn").length;
  const passes = checks.filter((check) => check.level === "pass").length;
  return { checks, fails, warns, passes, ok: fails === 0 };
}
