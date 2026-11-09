import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FileArchive, Loader2, UploadCloud } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { unzipSync } from "fflate";
import type { DevExtension, DevVersion } from "@/developer/types";
import { latestVersion, PERMISSIONS } from "@/developer/types";
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

export function ReleaseDialog({
  open,
  onOpenChange,
  ext,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ext: DevExtension;
  onPublished: () => void;
}) {
  const latest = latestVersion(ext) as DevVersion | undefined;
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [files, setFiles] = useState<Record<string, Uint8Array> | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [version, setVersion] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [changelog, setChangelog] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [minAppVersion, setMinAppVersion] = useState("0");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const suggestedCode = useMemo(() => nextVersionCode(ext), [ext]);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setBytes(null);
    setFiles(null);
    setManifest(null);
    setVersion("");
    setVersionCode(String(suggestedCode));
    setChangelog("");
    setPermissions(latest?.permissions || []);
    setMinAppVersion(String(latest?.min_app_version ?? 0));
    setBusy(false);
    setStage("");
    setError("");
    setDragging(false);
  }, [open, suggestedCode, latest]);

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
    setPermissions(Array.isArray(parsed.permissions) ? parsed.permissions.filter((p) => PERMISSIONS.includes(p as (typeof PERMISSIONS)[number])) : []);
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
        `manifest.json says versionCode ${manifest.versionCode}, the form says ${code}. They must match - the editor rewrites it for you.`,
      );
      return;
    }
    if (report && !report.ok) {
      setError(`Fix the ${report.fails} blocking check${report.fails === 1 ? "" : "s"} below before sending the release.`);
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
      onOpenChange(false);
    } catch (err) {
      setError(publishErrorText(err));
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New release for {ext.name}</DialogTitle>
          <DialogDescription>
            The package goes through the same review as a first submission. The last release is
            v{latest?.version || "—"} ({latest?.version_code ?? 0}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Package</Label>
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
              className={`flex w-full items-center gap-4 rounded-xl border border-dashed p-5 text-left transition-colors ${
                dragging ? "border-brand bg-brand-soft/10" : "border-border hover:bg-accent/40"
              }`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                {file ? <FileArchive className="size-5" /> : <UploadCloud className="size-5" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {file ? file.name : "Drop the .kodaext file here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file
                    ? `${(file.size / 1024).toFixed(0)} KB · versionCode ${manifest?.versionCode ?? "?"} in the manifest`
                    : "or click to choose a file · max 20 MB"}
                </p>
              </div>
            </button>
            <input
              ref={input}
              type="file"
              accept=".kodaext,.zip,application/zip"
              className="sr-only"
              onChange={(event) => void pick(event.target.files?.[0])}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="space-y-2">
            <Label htmlFor="rel-changelog">What changed</Label>
            <Textarea
              id="rel-changelog"
              value={changelog}
              rows={4}
              maxLength={4000}
              onChange={(event) => setChangelog(event.target.value)}
              placeholder="Shown to users with the update."
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              <p className="text-xs text-muted-foreground">
                Package manifest: {manifest.permissions.length ? manifest.permissions.join(", ") : "none"}.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rel-min">Minimum app version code</Label>
            <Input
              id="rel-min"
              value={minAppVersion}
              onChange={(event) => setMinAppVersion(event.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
            />
            <p className="text-xs text-muted-foreground">
              0 works on every app build. Set the first app build that can load this version.
            </p>
          </div>

          {report ? <PreflightPanel report={report} compact /> : null}

          {manifest && !changelog.trim() ? (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              A short changelog helps users decide whether to update.
            </p>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {busy && stage ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {stage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !file}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            Send to review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
