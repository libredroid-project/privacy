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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      setStage("Uploading the package…");
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
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All releases
          </button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">New release for {ext.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The package goes through the same review as a first submission. Last release: v
            {latest?.version || "-"} ({latest?.version_code ?? 0}).
          </p>
        </div>
        <Badge variant="outline" className="font-mono font-normal">
          {formatDate(latest?.created_at)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Card className="gap-0 p-5 shadow-none">
            <h2 className="text-sm font-semibold">Package</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A .kodaext zip with manifest.json in the root. Max 20 MB.
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
              className={`mt-4 flex w-full items-center gap-4 rounded-xl border border-dashed p-6 text-left transition-colors ${
                dragging ? "border-brand bg-brand-soft/10" : "border-border hover:bg-accent/40"
              }`}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                {file ? <FileArchive className="size-6" /> : <UploadCloud className="size-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {file ? file.name : "Drop the .kodaext file here"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {file
                    ? `${formatBytes(file.size)} · ${files ? Object.keys(files).length : 0} files · versionCode ${manifest?.versionCode ?? "?"} in the manifest`
                    : "or click to choose a file"}
                </p>
              </div>
              {file ? (
                <Badge variant="outline" className="font-normal tone-online">
                  loaded
                </Badge>
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
              <dl className="mt-4 grid gap-3 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Manifest id</dt>
                  <dd className="mt-0.5 font-mono">{manifest.id || "missing"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Manifest version</dt>
                  <dd className="mt-0.5 font-mono">
                    {manifest.version || "missing"} ({manifest.versionCode || "?"})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">License</dt>
                  <dd className="mt-0.5">{manifest.license || "missing"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Permissions in package</dt>
                  <dd className="mt-0.5 font-mono">
                    {manifest.permissions?.length ? manifest.permissions.join(", ") : "none"}
                  </dd>
                </div>
              </dl>
            ) : null}
          </Card>

          <Card className="gap-0 p-5 shadow-none">
            <h2 className="text-sm font-semibold">Release notes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Version, changelog and the app build this release needs.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rel-version">Version name</Label>
                <Input
                  id="rel-version"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.2.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rel-code">Version code</Label>
                <Input
                  id="rel-code"
                  value={versionCode}
                  onChange={(event) => setVersionCode(event.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={String(suggestedCode)}
                />
                <p className="text-xs text-muted-foreground">Must match manifest.json.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="rel-changelog">What changed</Label>
                <span className="text-xs text-muted-foreground">{changelog.length}/4000</span>
              </div>
              <Textarea
                id="rel-changelog"
                value={changelog}
                rows={5}
                maxLength={4000}
                onChange={(event) => setChangelog(event.target.value)}
                placeholder="Shown to users with the update."
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="rel-min">Minimum app version code</Label>
              <Input
                id="rel-min"
                value={minAppVersion}
                onChange={(event) => setMinAppVersion(event.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                0 works on every app build. Otherwise only builds from this code can install the
                update. It must match manifest.json.
              </p>
            </div>
          </Card>

          <Card className="gap-0 p-5 shadow-none">
            <h2 className="text-sm font-semibold">Permissions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Written to the release and compared against manifest.json.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-2 font-mono text-xs"
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
              <p className="mt-2 text-xs text-muted-foreground">
                Package manifest:{" "}
                <span className="font-mono">
                  {manifest.permissions.length ? manifest.permissions.join(", ") : "none"}
                </span>
              </p>
            ) : null}
          </Card>

          {report ? <PreflightPanel report={report} /> : null}

          <Card className="gap-0 p-5 shadow-none">
            <h2 className="text-sm font-semibold">Store listing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The release uses the current listing. You can change it separately, without a new
              version.
            </p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="mt-0.5">{ext.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="mt-0.5">{ext.category || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">License</dt>
                <dd className="mt-0.5">{ext.license || "missing"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Author</dt>
                <dd className="mt-0.5">{ext.author || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Short description</dt>
                <dd className="mt-0.5 text-muted-foreground">{ext.summary || "missing"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                <ImageIcon className="mr-1 size-3" />
                {ext.icon_url ? "icon set" : "no icon"}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {ext.screenshots?.length || 0}/6 screenshots
              </Badge>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onEditListing}>
                Edit store listing
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="gap-0 p-4 shadow-none">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Release summary</h2>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-mono text-xs">{version || "-"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Code</dt>
                <dd className="font-mono text-xs">{versionCode || "-"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Package</dt>
                <dd className="font-mono text-xs">{file ? formatBytes(file.size) : "-"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Permissions</dt>
                <dd className="font-mono text-xs">{permissions.length}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-2 rounded-lg border p-2.5 text-xs">
              <ShieldCheck className={report?.ok ? "size-4 text-success" : "size-4 text-muted-foreground"} />
              <span>
                {report
                  ? `${report.passes} passed · ${report.warns} warnings · ${report.fails} blocking`
                  : "Checks start when a package is loaded."}
              </span>
            </div>

            <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy || !file}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Send to review
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={onBack} disabled={busy}>
              Cancel
            </Button>

            {stage ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {stage}
              </p>
            ) : null}
          </Card>

          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              After sending, the release is PENDING until an admin reviews it. Store downloads keep
              using the current approved version.
            </span>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </div>
  );
}
