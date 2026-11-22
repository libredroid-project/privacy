import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, assertSafeUploadUrl } from "@/lib/api";
import type { AssetUpload, CreatedSubmission, MyExtension } from "@/store/types";
import { CATEGORIES, PERMISSIONS } from "@/store/types";

const ERROR_TEXT: Record<string, string> = {
  already_submitted:
    "This id is already submitted. Use the version fields to upload a new version of your own extension.",
  id_taken: "This extension id is already taken by another author - pick a different one.",
  too_many_pending_submissions:
    "You already have 3 submissions in review. Wait for the review before adding more.",
  version_code_too_low: "The version code must be higher than your last submitted one.",
  pending_version_exists:
    "One version is already in review for this extension. Wait for the review before submitting the next one.",
  sha256_mismatch: "The uploaded package does not match what was announced - please try again.",
  email_not_verified:
    "Verify your e-mail first: use the developer console (/developer) or open the KodaHosting app, Settings, Account and verify the address there.",
};

type Status = { kind: "idle" | "busy" | "ok" | "err"; text: string };

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function uploadImage(file: File): Promise<string> {
  const data = await api<AssetUpload>("/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: file.type }),
  });
  assertSafeUploadUrl(data.upload.signed_url);
  const put = await fetch(data.upload.signed_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`image upload failed (${put.status})`);
  return data.public_url;
}

const initialForm = {
  extId: "",
  name: "",
  version: "",
  versionCode: "",
  license: "",
  author: "",
  category: "tools",
  source: "",
  summary: "",
  description: "",
  changelog: "",
};

function FileField({
  id,
  label,
  accept,
  multiple,
  fileName,
  hint,
  onFiles,
}: {
  id: string;
  label: string;
  accept: string;
  multiple?: boolean;
  fileName: string;
  hint?: string;
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        onClick={(event) => {
          event.preventDefault();
          input.current?.click();
        }}
        className="cursor-pointer"
      >
        {label}
      </Label>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-10 w-full min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-2.5 text-left text-sm transition-colors hover:bg-zinc-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      >
        <span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.08] dark:text-zinc-100">
          Choose file
        </span>
        <span className="truncate text-zinc-500 dark:text-zinc-400">{fileName || "No file chosen"}</span>
      </button>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => onFiles(Array.from(event.target.files || []))}
      />
      {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export function SubmitDialog({
  open,
  onOpenChange,
  mineItems,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mineItems: MyExtension[];
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [icon, setIcon] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [pkg, setPkg] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const busy = status.kind === "busy";

  useEffect(() => {
    if (open) setStatus({ kind: "idle", text: "" });
  }, [open]);

  function set<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePermission(permission: string, checked: boolean) {
    setPermissions((current) =>
      checked ? [...current, permission] : current.filter((item) => item !== permission),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const extId = form.extId.trim();
      const name = form.name.trim();
      const license = form.license.trim();
      const versionCode = parseInt(form.versionCode, 10);

      if (!/^[a-z0-9]+(\.[a-z0-9_-]+)+$/.test(extId)) {
        throw new Error("The id must look like com.example.name (lowercase, dots).");
      }
      if (!name) throw new Error("A name is required.");
      if (!versionCode || versionCode < 1) throw new Error("A version code (whole number) is required.");
      if (!license) throw new Error("A license is required.");
      if (!pkg) throw new Error("Pick the .kodaext package.");
      if (pkg.size > 20 * 1024 * 1024) throw new Error("The package must be under 20 MB.");

      setStatus({ kind: "busy", text: "Hashing the package..." });
      const sha256 = await sha256Hex(pkg);

      setStatus({ kind: "busy", text: "Uploading images..." });
      const iconUrl = icon ? await uploadImage(icon) : null;
      const shotUrls: string[] = [];
      for (const shot of screenshots.slice(0, 4)) shotUrls.push(await uploadImage(shot));

      const metadata = {
        ext_id: extId,
        name,
        version: form.version.trim(),
        version_code: versionCode,
        license,
        author: form.author.trim() || null,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        source_url: form.source.trim() || null,
        changelog: form.changelog.trim() || null,
        permissions,
        icon_url: iconUrl,
        screenshots: shotUrls,
        sha256,
        file_size: pkg.size,
      };

      setStatus({ kind: "busy", text: "Creating the submission..." });
      const existing = mineItems.find((item) => item.ext_id === extId);
      const created = existing
        ? await api<CreatedSubmission>(`/v1/extensions/${encodeURIComponent(extId)}/versions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metadata),
          })
        : await api<CreatedSubmission>("/v1/extensions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metadata),
          });

      setStatus({ kind: "busy", text: "Uploading the package..." });
      assertSafeUploadUrl(created.upload.signed_url);
      const put = await fetch(created.upload.signed_url, {
        method: "PUT",
        headers: { "Content-Type": "application/zip" },
        body: pkg,
      });
      if (!put.ok) throw new Error(`package upload failed (${put.status})`);

      setStatus({ kind: "busy", text: "Verifying the package..." });
      await api(`/v1/extensions/${encodeURIComponent(extId)}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_code: versionCode }),
      });

      setStatus({
        kind: "ok",
        text: 'Submitted. Your extension is now in review - the status shows up under "My extensions".',
      });
      onSubmitted();
    } catch (error) {
      const message = (error as Error).message || "Something went wrong.";
      setStatus({ kind: "err", text: ERROR_TEXT[message] || `Could not submit: ${message}` });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto rounded-2xl border-zinc-200/80 bg-white p-0 sm:max-w-2xl dark:border-white/[0.08] dark:bg-[#09090b]">
        <DialogHeader className="border-b border-zinc-200/80 p-6 pr-14 dark:border-white/[0.06]">
          <DialogTitle className="text-lg font-medium tracking-[-0.02em] text-zinc-950 dark:text-white">
            Submit an extension
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            A package and its metadata go to review. The store shows it after a hand check.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-7 p-6">
          <fieldset disabled={busy} className="space-y-7">
            <section className="space-y-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Package
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="in-extid">Extension id</Label>
                  <Input
                    id="in-extid"
                    placeholder="com.example.name"
                    value={form.extId}
                    onChange={(event) => set("extId", event.target.value)}
                    required
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Lowercase, dots, no spaces.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-name">Name</Label>
                  <Input
                    id="in-name"
                    value={form.name}
                    onChange={(event) => set("name", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-version">Version</Label>
                  <Input
                    id="in-version"
                    placeholder="1.0.0"
                    value={form.version}
                    onChange={(event) => set("version", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-versioncode">Version code</Label>
                  <Input
                    id="in-versioncode"
                    inputMode="numeric"
                    placeholder="1"
                    value={form.versionCode}
                    onChange={(event) => set("versionCode", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-license">License</Label>
                  <Input
                    id="in-license"
                    placeholder="GPL-3.0-only"
                    value={form.license}
                    onChange={(event) => set("license", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-category">Category</Label>
                  <Select value={form.category} onValueChange={(value) => set("category", value)}>
                    <SelectTrigger id="in-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(([value]) => value !== "all").map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <FileField
                id="in-package"
                label="Package (.kodaext or .zip)"
                accept=".kodaext,.zip"
                fileName={pkg?.name || ""}
                hint="At most 20 MB."
                onFiles={(files) => setPkg(files[0] || null)}
              />
            </section>

            <Separator className="bg-zinc-200/80 dark:bg-white/[0.06]" />

            <section className="space-y-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="in-author">Author</Label>
                  <Input
                    id="in-author"
                    placeholder="your name (optional)"
                    value={form.author}
                    onChange={(event) => set("author", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-source">Source code URL</Label>
                  <Input
                    id="in-source"
                    placeholder="https://github.com/..."
                    value={form.source}
                    onChange={(event) => set("source", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="in-summary">Short summary</Label>
                <Input
                  id="in-summary"
                  maxLength={200}
                  value={form.summary}
                  onChange={(event) => set("summary", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="in-description">Description</Label>
                <Textarea
                  id="in-description"
                  rows={4}
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="in-changelog">Changelog</Label>
                <Textarea
                  id="in-changelog"
                  rows={3}
                  value={form.changelog}
                  onChange={(event) => set("changelog", event.target.value)}
                />
              </div>
            </section>

            <Separator className="bg-zinc-200/80 dark:bg-white/[0.06]" />

            <section className="space-y-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Permissions
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {PERMISSIONS.map((permission) => (
                  <div key={permission} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`perm-${permission}`}
                      checked={permissions.includes(permission)}
                      onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                    />
                    <Label htmlFor={`perm-${permission}`} className="font-mono text-xs font-normal">
                      {permission}
                    </Label>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="bg-zinc-200/80 dark:bg-white/[0.06]" />

            <section className="space-y-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Images
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FileField
                  id="in-icon"
                  label="Icon"
                  accept="image/png,image/jpeg,image/webp"
                  fileName={icon?.name || ""}
                  onFiles={(files) => setIcon(files[0] || null)}
                />
                <FileField
                  id="in-shots"
                  label="Screenshots (up to 4)"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  fileName={screenshots.map((file) => file.name).join(", ")}
                  onFiles={setScreenshots}
                />
              </div>
            </section>
          </fieldset>

          {status.kind !== "idle" ? (
            <Alert
              variant={status.kind === "err" ? "destructive" : "default"}
              role="status"
              aria-live="polite"
              className="rounded-xl"
            >
              {status.kind === "busy" ? <Loader2 className="size-4 animate-spin" /> : null}
              {status.kind === "ok" ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> : null}
              {status.kind === "err" ? <AlertCircle className="size-4" /> : null}
              <AlertDescription>{status.text}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="koda-btn-black h-10 w-full rounded-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Submit for review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
