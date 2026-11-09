import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, assertSafeUploadUrl } from "@/lib/api";
import type { AssetUpload } from "@/store/types";
import { CATEGORIES, displayStatus, displayStatusTone, type DevExtension } from "@/developer/types";

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
  if (!put.ok) throw new Error(`Image upload failed (${put.status}).`);
  return data.public_url;
}

interface ListingForm {
  name: string;
  summary: string;
  description: string;
  category: string;
  license: string;
  author: string;
  homepage_url: string;
  source_url: string;
  icon_url: string;
  screenshots: string[];
}

function fromExtension(ext: DevExtension): ListingForm {
  return {
    name: ext.name || "",
    summary: ext.summary || "",
    description: ext.description || "",
    category: ext.category || "other",
    license: ext.license || "",
    author: ext.author || "",
    homepage_url: ext.homepage_url || "",
    source_url: ext.source_url || "",
    icon_url: ext.icon_url || "",
    screenshots: ext.screenshots || [],
  };
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={value > max ? "text-destructive" : "text-muted-foreground"}>
      {value}/{max}
    </span>
  );
}

export function ListingEditor({
  ext,
  onSaved,
}: {
  ext: DevExtension;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ListingForm>(() => fromExtension(ext));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"icon" | "shot" | null>(null);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const shotInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(fromExtension(ext));
    setError("");
    setSavedAt(null);
  }, [ext]);

  const initial = fromExtension(ext);
  const dirty = JSON.stringify(initial) !== JSON.stringify(form);

  function set<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedAt(null);
  }

  async function pickImage(file: File | undefined, kind: "icon" | "shot") {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError("Use a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("The image must be under 2 MB.");
      return;
    }
    setUploading(kind);
    setError("");
    try {
      const url = await uploadImage(file);
      if (kind === "icon") set("icon_url", url);
      else set("screenshots", [...form.screenshots, url].slice(0, 6));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (form.name.trim().length < 2) {
      setError("The name needs at least two characters.");
      return;
    }
    const over =
      form.summary.length > 200 ||
      form.description.length > 6000 ||
      form.license.length > 64 ||
      form.author.length > 64;
    if (over) {
      setError("One field is over its limit.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/v1/extensions/${encodeURIComponent(ext.ext_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          summary: form.summary.trim() || null,
          description: form.description.trim() || null,
          category: form.category,
          license: form.license.trim() || null,
          author: form.author.trim() || null,
          homepage_url: form.homepage_url.trim() || null,
          source_url: form.source_url.trim() || null,
          icon_url: form.icon_url.trim() || null,
          screenshots: form.screenshots,
        }),
      });
      setSavedAt(Date.now());
      toast.success("Listing saved.");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Store listing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What users see in the store. Changes do not need a new version, but they are saved
            directly for the live listing.
          </p>

          <div className="mt-5 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dev-name">Name</Label>
              <span className="text-xs">
                <Counter value={form.name.length} max={80} />
              </span>
            </div>
            <Input
              id="dev-name"
              value={form.name}
              maxLength={80}
              onChange={(event) => set("name", event.target.value)}
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dev-summary">Short description</Label>
              <span className="text-xs">
                <Counter value={form.summary.length} max={200} />
              </span>
            </div>
            <Textarea
              id="dev-summary"
              value={form.summary}
              rows={2}
              maxLength={200}
              onChange={(event) => set("summary", event.target.value)}
              placeholder="One line for the store card."
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dev-description">Description</Label>
              <span className="text-xs">
                <Counter value={form.description.length} max={6000} />
              </span>
            </div>
            <Textarea
              id="dev-description"
              value={form.description}
              rows={8}
              maxLength={6000}
              onChange={(event) => set("description", event.target.value)}
              placeholder="What the extension does, which permissions it needs and why."
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dev-category">Category</Label>
              <Select value={form.category} onValueChange={(value) => set("category", value)}>
                <SelectTrigger id="dev-category" className="w-full">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-license">License</Label>
              <Input
                id="dev-license"
                value={form.license}
                maxLength={64}
                onChange={(event) => set("license", event.target.value)}
                placeholder="GPL-3.0-only"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-author">Author</Label>
              <Input
                id="dev-author"
                value={form.author}
                maxLength={64}
                onChange={(event) => set("author", event.target.value)}
                placeholder="Your developer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-homepage">Homepage</Label>
              <Input
                id="dev-homepage"
                value={form.homepage_url}
                onChange={(event) => set("homepage_url", event.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="dev-source">Source code</Label>
              <Input
                id="dev-source"
                value={form.source_url}
                onChange={(event) => set("source_url", event.target.value)}
                placeholder="https://github.com/…"
              />
            </div>
          </div>
        </Card>

        <Card className="gap-0 p-5 shadow-none">
          <h2 className="text-sm font-semibold">Artwork</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PNG, JPEG or WebP, up to 2 MB. Up to six screenshots.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {form.icon_url ? (
                <img src={form.icon_url} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Store icon</p>
              <p className="truncate text-xs text-muted-foreground">{form.icon_url || "No icon yet"}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => iconInput.current?.click()}
              disabled={uploading !== null}
            >
              {uploading === "icon" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
            {form.icon_url ? (
              <Button size="icon-sm" variant="ghost" aria-label="Remove icon" onClick={() => set("icon_url", "")}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
            <input
              ref={iconInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void pickImage(event.target.files?.[0], "icon")}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Screenshots</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => shotInput.current?.click()}
                disabled={uploading !== null || form.screenshots.length >= 6}
              >
                {uploading === "shot" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                Add image
              </Button>
              <input
                ref={shotInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => void pickImage(event.target.files?.[0], "shot")}
              />
            </div>
            {form.screenshots.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No screenshots yet.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.screenshots.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border">
                    <img src={url} alt="" className="aspect-video w-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "screenshots",
                          form.screenshots.filter((_, item) => item !== index),
                        )
                      }
                      className="absolute top-1.5 right-1.5 rounded-md bg-black/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Remove screenshot ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="gap-0 p-4 shadow-none">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</p>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-sm font-medium">
              {form.icon_url ? (
                <img src={form.icon_url} alt="" className="size-full object-cover" />
              ) : (
                (form.name || "?").trim().charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{form.name || "Untitled extension"}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{ext.ext_id}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {form.summary || "No short description yet."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {CATEGORIES.find(([id]) => id === form.category)?.[1] || "Other"}
            </Badge>
            <Badge variant="outline" className={`font-normal ${displayStatusTone(ext)}`}>
              {displayStatus(ext)}
            </Badge>
          </div>
          {form.screenshots.length > 0 ? (
            <img
              src={form.screenshots[0]}
              alt=""
              className="mt-4 aspect-video w-full rounded-lg border object-cover"
            />
          ) : null}
          {ext.status === "APPROVED" ? (
            <a
              href={`/store?ext=${encodeURIComponent(ext.ext_id)}`}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Open in store <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </Card>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={() => void save()} disabled={busy || !dirty}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save listing
          </Button>
          {dirty ? (
            <Button variant="ghost" size="sm" onClick={() => setForm(initial)} disabled={busy}>
              Discard changes
            </Button>
          ) : savedAt ? (
            <p className="text-center text-xs text-muted-foreground">Saved.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
