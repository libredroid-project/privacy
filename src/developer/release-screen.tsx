import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  Package,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { unzipSync } from "fflate";
import type { DevExtension, DevVersion } from "@/developer/types";
import { formatBytes, formatDate, latestVersion, PERMISSIONS } from "@/developer/types";
import { publishErrorText, publishVersion } from "@/developer/publish";
import { runPreflight } from "@/developer/preflight";
import { PreflightPanel } from "@/developer/preflight-panel";
import { cn } from "@/lib/utils";

interface Manifest {
  id?: string;
  name?: string;
  version?: string;
  versionCode?: number;
  license?: string;
  permissions?: string[];
  minAppVersion?: number;
}

interface Unpacked {
  files: Record<string, Uint8Array>;
  manifest: Manifest;
}

function nextVersionCode(ext: DevExtension): number {
  return Math.max(0, ...ext.versions.map((version) => version.version_code)) + 1;
}

function bumpPatch(version?: string): string {
  const parts = (version || "0.0.0").split(".").map((part) => parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[parts.length - 1] += 1;
  return parts.join(".");
}

function unpackPackage(bytes: Uint8Array): Unpacked | null {
  try {
    const raw = unzipSync(bytes);
    const files = Object.fromEntries(
      Object.entries(raw).filter(([path]) => !path.endsWith("/")),
    );
    const key =
      Object.keys(files).find((name) => name === "manifest.json") ??
      Object.keys(files).find((name) => name.endsWith("/manifest.json"));
    if (!key) return null;
    const manifest = JSON.parse(new TextDecoder().decode(files[key])) as Manifest;
    return { files, manifest };
  } catch {
    return null;
  }
}

const INPUT_CLASS =
  "rounded-xl border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500";

export function ReleaseScreen({
  ext,
  onBack,
  onPublished,
  onEditListing,
}: {
  ext: DevExtension;
  onBack: () => void;
  onPublished: () => void;
  onEditListing: () => void;
}) {
  const latest = latestVersion(ext) as DevVersion | undefined;
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [files, setFiles] = useState<Record<string, Uint8Array> | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [version, setVersion] = useState("");
  const [versionCode, setVersionCode] = useState(String(nextVersionCode(ext)));
  const [changelog, setChangelog] = useState("");
  const [permissions, setPermissions] = useState<string[]>(latest?.permissions || []);
  const [minAppVersion, setMinAppVersion] = useState(String(latest?.min_app_version ?? 0));
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const suggestedCode = nextVersionCode(ext);

  useEffect(() => {
    setVersion(bumpPatch(latest?.version));
    setVersionCode(String(suggestedCode));
    setChangelog("");
    setPermissions(latest?.permissions || []);
    setMinAppVersion(String(latest?.min_app_version ?? 0));
    setFile(null);
    setBytes(null);
    setFiles(null);
    setManifest(null);
    setError("");
  }, [ext.ext_id, latest?.version, latest?.version_code, suggestedCode]);

  async function pick(next: File | undefined) {
    if (!next) return;
    setError("");
    if (next.size > 20 * 1024 * 1024) {
      setError("The package must be under 20 MB.");
      return;
    }
    const data = new Uint8Array(await next.arrayBuffer());
    const unpacked = unpackPackage(data);
    if (!unpacked) {
      setError("No manifest.json in this zip. A .kodaext package needs one in the root.");
      return;
    }
    const parsed = unpacked.manifest;
    if (parsed.id && parsed.id !== ext.ext_id) {
      setError(`This package is for ${parsed.id}, not ${ext.ext_id}.`);
      return;
    }
    const manifestCode = Number(parsed.versionCode || 0);
    setFile(next);
    setBytes(data);
    setFiles(unpacked.files);
    setManifest(parsed);
    setVersion(parsed.version || bumpPatch(latest?.version));
    setVersionCode(String(Math.max(suggestedCode, manifestCode || suggestedCode)));
    setPermissions(
      Array.isArray(parsed.permissions)
        ? parsed.permissions.filter((permission) => PERMISSIONS.includes(permission as (typeof PERMISSIONS)[number]))
        : [],
    );
    setMinAppVersion(String(Number(parsed.minAppVersion || 0)));
  }

  const report = useMemo(() => {
    if (!files) return null;
    return runPreflight(ext, files, {
      version: version.trim(),
      versionCode: parseInt(versionCode, 10) || 0,
      changelog,
      permissions,
      minAppVersion: Math.max(0, parseInt(minAppVersion, 10) || 0),
    });
  }, [files, ext, version, versionCode, changelog, permissions, minAppVersion]);

  async function submit() {
    if (!bytes || !file) {
      setError("Pick the .kodaext package first.");
      return;
    }
    const code = parseInt(versionCode, 10);
    if (!/^[0-9]+(\.[0-9]+)*$/.test(version.trim())) {
      setError("The version must look like 1.2.0.");
      return;
    }
    if (!code || code <= (latest?.version_code ?? 0)) {
      setError(`The version code must be higher than ${latest?.version_code ?? 0}.`);
      return;
    }
    if (manifest && Number(manifest.versionCode) !== code) {
      setError(
        `manifest.json says versionCode ${manifest.versionCode}, the form says ${code}. They must match, otherwise the server rejects the package.`,
      );
      return;
    }
    if (report && !report.ok) {
      setError(`Fix the ${report.fails} blocking check${report.fails === 1 ? "" : "s"} before sending the release.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setStage("Uploading the package...");
      await publishVersion(ext, bytes, {
        version: version.trim(),
        versionCode: code,
        changelog: changelog.trim(),
        permissions,
        minAppVersion: Math.max(0, parseInt(minAppVersion, 10) || 0),
      });
      onPublished();
      onBack();
    } catch (err) {
      setError(publishErrorText(err));
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="size-3.5" /> All releases
          </button>
          <h1 className="mt-3 font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
            New release for {ext.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            The package goes through the same review as a first submission. Last release: v
            {latest?.version || "-"} ({latest?.version_code ?? 0}).
          </p>
        </div>
        <span className="font-mono text-xs text-zinc-500">{formatDate(latest?.created_at)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <div className="resend-glass-panel rounded-2xl p-6">
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">Package</h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              A .kodaext archive with manifest.json at the root. Max 20 MB.
            </p>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void pick(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                "mt-4 flex w-full items-center gap-4 rounded-xl border border-dashed p-6 text-left transition-colors",
                dragging
                  ? "border-brand bg-brand/10"
                  : "border-zinc-300 hover:bg-black/[0.02] dark:border-white/[0.12] dark:hover:bg-white/[0.03]",
              )}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200">
                {file ? <FileArchive className="size-6" /> : <UploadCloud className="size-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-medium text-zinc-950 dark:text-white">
                  {file ? file.name : "Drop the .kodaext file here"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  {file
                    ? `${formatBytes(file.size)} · ${files ? Object.keys(files).length : 0} files · versionCode ${manifest?.versionCode ?? "?"}`
                    : "or click to choose a file"}
                </p>
              </div>
              {file ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Loaded
                </span>
              ) : null}
            </button>
            <input
              ref={input}
              type="file"
              accept=".kodaext,.zip,application/zip"
              className="sr-only"
              onChange={(event) => void pick(event.target.files?.[0])}
            />

            {manifest ? (
              <dl className="mt-4 grid gap-3 rounded-xl bg-zinc-100/80 p-3.5 text-xs dark:bg-white/[0.03] sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Manifest id</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">{manifest.id || "missing"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Manifest version</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">
                    {manifest.version || "missing"} ({manifest.versionCode || "?"})
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">License</dt>
                  <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{manifest.license || "missing"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Permissions in package</dt>
                  <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">
                    {manifest.permissions?.length ? manifest.permissions.join(", ") : "none"}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="resend-glass-panel rounded-2xl p-6">
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Release notes
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Version, changelog, and minimum app build required for this release.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rel-version" className="text-xs text-zinc-600 dark:text-zinc-400">
                  Version name
                </Label>
                <Input
                  id="rel-version"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.2.0"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rel-code" className="text-xs text-zinc-600 dark:text-zinc-400">
                  Version code
                </Label>
                <Input
                  id="rel-code"
                  value={versionCode}
                  onChange={(event) => setVersionCode(event.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={String(suggestedCode)}
                  className={INPUT_CLASS}
                />
                <p className="text-xs text-zinc-500">Must match manifest.json.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="rel-changelog" className="text-xs text-zinc-600 dark:text-zinc-400">
                  What changed
                </Label>
                <span className="font-mono text-[11px] text-zinc-500">{changelog.length}/4000</span>
              </div>
              <Textarea
                id="rel-changelog"
                value={changelog}
                rows={5}
                maxLength={4000}
                onChange={(event) => setChangelog(event.target.value)}
                placeholder="Shown to users with the update."
                className={INPUT_CLASS}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="rel-min" className="text-xs text-zinc-600 dark:text-zinc-400">
                Minimum app version code
              </Label>
              <Input
                id="rel-min"
                value={minAppVersion}
                onChange={(event) => setMinAppVersion(event.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className={INPUT_CLASS}
              />
              <p className="text-xs text-zinc-500">
                0 works on every app build. Otherwise only builds from this code onward can install the update. Must match manifest.json.
              </p>
            </div>
          </div>

          <div className="resend-glass-panel rounded-2xl p-6">
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Permissions
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Written to the release and compared against manifest.json.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs text-zinc-800 transition-colors hover:bg-black/[0.02] dark:border-white/[0.08] dark:text-zinc-200 dark:hover:bg-white/[0.03]"
                >
                  <Checkbox
                    checked={permissions.includes(permission)}
                    onCheckedChange={(checked) =>
                      setPermissions((current) =>
                        checked ? [...current, permission] : current.filter((item) => item !== permission),
                      )
                    }
                  />
                  {permission}
                </label>
              ))}
            </div>
            {manifest && Array.isArray(manifest.permissions) ? (
              <p className="mt-3 text-xs text-zinc-500">
                Package manifest:{" "}
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {manifest.permissions.length ? manifest.permissions.join(", ") : "none"}
                </span>
              </p>
            ) : null}
          </div>

          {report ? <PreflightPanel report={report} /> : null}

          <div className="resend-glass-panel rounded-2xl p-6">
            <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
              Store listing
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              The release uses your current listing. You can update it anytime without publishing a new version.
            </p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">Name</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{ext.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Category</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{ext.category || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">License</dt>
                <dd className="mt-0.5 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  {ext.license || "missing"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Author</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{ext.author || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">Short description</dt>
                <dd className="mt-0.5 text-zinc-600 dark:text-zinc-400">{ext.summary || "missing"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-200/70 pt-4 dark:border-white/[0.06]">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                <ImageIcon className="size-3.5" />
                {ext.icon_url ? "Icon set" : "No icon"} · {ext.screenshots?.length || 0}/6 screenshots
              </span>
              <button
                type="button"
                onClick={onEditListing}
                className="koda-btn-pill ml-auto h-8 px-3.5 text-xs"
              >
                Edit store listing
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="resend-glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-zinc-500" />
              <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
                Release summary
              </h2>
            </div>
            <dl className="mt-3.5 divide-y divide-zinc-200/70 text-sm dark:divide-white/[0.06]">
              <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                <dt className="text-zinc-500">Version</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">{version || "-"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-zinc-500">Code</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">{versionCode || "-"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-zinc-500">Package</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  {file ? formatBytes(file.size) : "-"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 last:pb-0">
                <dt className="text-zinc-500">Permissions</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">{permissions.length}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-100/80 p-3 text-xs text-zinc-700 dark:bg-white/[0.04] dark:text-zinc-300">
              <ShieldCheck
                className={cn(
                  "size-4 shrink-0",
                  report?.ok ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500",
                )}
              />
              <span>
                {report
                  ? `${report.passes} passed · ${report.warns} warnings · ${report.fails} blocking`
                  : "Checks run once a package is loaded."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !file}
              className="koda-btn-black mt-4 h-10 w-full px-4 text-xs disabled:opacity-45"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Send to review
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="koda-btn-pill mt-2 h-9 w-full px-4 text-xs disabled:opacity-45"
            >
              Cancel
            </button>

            {stage ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="size-3.5 animate-spin" /> {stage}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-zinc-200 p-3.5 text-xs leading-5 text-zinc-500 dark:border-white/[0.1] dark:text-zinc-400">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              After sending, the release stays PENDING until reviewed. Store downloads keep serving the current approved version.
            </span>
          </div>

          {error ? (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </div>
  );
}
