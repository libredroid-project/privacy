import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { safeExternalUrl, safeImageUrl } from "@/lib/security";
import type { AssetUpload } from "@/store/types";
import { CATEGORIES, displayStatus, displayStatusDotClasses, type DevExtension } from "@/developer/types";
import { cn } from "@/lib/utils";

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
    <span className={cn("font-mono text-[11px] tabular-nums", value > max ? "text-red-500" : "text-zinc-500")}>
      {value}/{max}
    </span>
  );
}

const INPUT_CLASS =
  "rounded-xl border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500";

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
  const tone = displayStatusDotClasses(ext);

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
    const cleanHomepage = form.homepage_url.trim();
    const cleanSource = form.source_url.trim();
    const safeHomepage = cleanHomepage ? safeExternalUrl(cleanHomepage) : null;
    const safeSource = cleanSource ? safeExternalUrl(cleanSource) : null;
    if (cleanHomepage && !safeHomepage) {
      setError("Homepage must be a public https:// URL.");
      return;
    }
    if (cleanSource && !safeSource) {
      setError("Source code link must be a public https:// URL.");
      return;
    }
    const cleanIcon = form.icon_url.trim();
    const safeIcon = cleanIcon ? safeImageUrl(cleanIcon) : null;
    if (cleanIcon && !safeIcon) {
      setError("Store icon must be a public https:// image URL.");
      return;
    }
    const safeShots = form.screenshots
      .map((shot) => safeImageUrl(shot))
      .filter((shot): shot is string => Boolean(shot));

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
          homepage_url: safeHomepage,
          source_url: safeSource,
          icon_url: safeIcon,
          screenshots: safeShots,
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
        <div className="resend-glass-panel rounded-2xl p-6">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            Store listing
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            What users see in the store. Changes save directly to the live listing without needing a new release.
          </p>

          <div className="mt-5 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dev-name" className="text-xs text-zinc-600 dark:text-zinc-400">
                Name
              </Label>
              <Counter value={form.name.length} max={80} />
            </div>
            <Input
              id="dev-name"
              value={form.name}
              maxLength={80}
              onChange={(event) => set("name", event.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dev-summary" className="text-xs text-zinc-600 dark:text-zinc-400">
                Short description
              </Label>
              <Counter value={form.summary.length} max={200} />
            </div>
            <Textarea
              id="dev-summary"
              value={form.summary}
              rows={2}
              maxLength={200}
              onChange={(event) => set("summary", event.target.value)}
              placeholder="One line for the store card."
              className={INPUT_CLASS}
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dev-description" className="text-xs text-zinc-600 dark:text-zinc-400">
                Description
              </Label>
              <Counter value={form.description.length} max={6000} />
            </div>
            <Textarea
              id="dev-description"
              value={form.description}
              rows={8}
              maxLength={6000}
              onChange={(event) => set("description", event.target.value)}
              placeholder="What the extension does, which permissions it needs, and why."
              className={INPUT_CLASS}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dev-category" className="text-xs text-zinc-600 dark:text-zinc-400">
                Category
              </Label>
              <Select value={form.category} onValueChange={(value) => set("category", value)}>
                <SelectTrigger id="dev-category" className={cn("w-full", INPUT_CLASS)}>
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
              <Label htmlFor="dev-license" className="text-xs text-zinc-600 dark:text-zinc-400">
                License
              </Label>
              <Input
                id="dev-license"
                value={form.license}
                maxLength={64}
                onChange={(event) => set("license", event.target.value)}
                placeholder="GPL-3.0-only"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-author" className="text-xs text-zinc-600 dark:text-zinc-400">
                Author
              </Label>
              <Input
                id="dev-author"
                value={form.author}
                maxLength={64}
                onChange={(event) => set("author", event.target.value)}
                placeholder="Your developer name"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-homepage" className="text-xs text-zinc-600 dark:text-zinc-400">
                Homepage
              </Label>
              <Input
                id="dev-homepage"
                value={form.homepage_url}
                onChange={(event) => set("homepage_url", event.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="dev-source" className="text-xs text-zinc-600 dark:text-zinc-400">
                Source code
              </Label>
              <Input
                id="dev-source"
                value={form.source_url}
                onChange={(event) => set("source_url", event.target.value)}
                placeholder="https://github.com/..."
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        <div className="resend-glass-panel rounded-2xl p-6">
          <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">Artwork</h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            PNG, JPEG, or WebP up to 2 MB. Up to six screenshots.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/[0.08]">
              {safeImageUrl(form.icon_url) ? (
                <img src={safeImageUrl(form.icon_url)!} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-zinc-400 dark:text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">Store icon</p>
              <p className="truncate font-mono text-xs text-zinc-500">{form.icon_url || "No icon yet"}</p>
            </div>
            <button
              type="button"
              onClick={() => iconInput.current?.click()}
              disabled={uploading !== null}
              className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-45"
            >
              {uploading === "icon" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload
            </button>
            {form.icon_url ? (
              <button
                type="button"
                aria-label="Remove icon"
                onClick={() => set("icon_url", "")}
                className="flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
            <input
              ref={iconInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void pickImage(event.target.files?.[0], "icon")}
            />
          </div>

          <div className="mt-6 border-t border-zinc-200/70 pt-5 dark:border-white/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">Screenshots</p>
              <button
                type="button"
                onClick={() => shotInput.current?.click()}
                disabled={uploading !== null || form.screenshots.length >= 6}
                className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-45"
              >
                {uploading === "shot" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Add image
              </button>
              <input
                ref={shotInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => void pickImage(event.target.files?.[0], "shot")}
              />
            </div>
            {form.screenshots.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-white/[0.1] dark:text-zinc-400">
                No screenshots yet.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.screenshots.map((url, index) => {
                  const safeShot = safeImageUrl(url);
                  return (
                    <div
                      key={`${url}-${index}`}
                      className="group relative overflow-hidden rounded-xl ring-1 ring-black/[0.07] dark:ring-white/[0.08]"
                    >
                      {safeShot ? (
                        <img src={safeShot} alt="" className="aspect-video w-full object-cover" />
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-zinc-100 text-xs text-zinc-500 dark:bg-white/[0.04]">
                          Invalid URL
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "screenshots",
                            form.screenshots.filter((_, item) => item !== index),
                          )
                        }
                        className="absolute top-1.5 right-1.5 rounded-lg bg-black/75 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="resend-glass-panel rounded-2xl p-5">
          <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
            Live preview
          </p>
          <div className="mt-3.5 flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 font-display text-sm font-medium text-zinc-800 ring-1 ring-black/[0.06] dark:bg-white/[0.06] dark:text-white dark:ring-white/[0.08]">
              {safeImageUrl(form.icon_url) ? (
                <img src={safeImageUrl(form.icon_url)!} alt="" className="size-full object-cover" />
              ) : (
                (form.name || "?").trim().charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-medium text-zinc-950 dark:text-white">
                {form.name || "Untitled extension"}
              </p>
              <p className="truncate font-mono text-[11px] text-zinc-500">{ext.ext_id}</p>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                {form.summary || "No short description yet."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
            <span>{CATEGORIES.find(([id]) => id === form.category)?.[1] || "Other"}</span>
            <span>·</span>
            <span className={cn("inline-flex items-center gap-1.5", tone.text)}>
              <span className={cn("size-1.5 rounded-full", tone.dot)} />
              {displayStatus(ext)}
            </span>
          </div>
          {safeImageUrl(form.screenshots[0]) ? (
            <img
              src={safeImageUrl(form.screenshots[0])!}
              alt=""
              className="mt-4 aspect-video w-full rounded-xl object-cover ring-1 ring-black/[0.07] dark:ring-white/[0.08]"
            />
          ) : null}
          {ext.status === "APPROVED" ? (
            <a
              href={`/store?ext=${encodeURIComponent(ext.ext_id)}`}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Open in store <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !dirty}
            className="koda-btn-black h-10 w-full px-4 text-xs disabled:opacity-45"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save listing
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={() => setForm(initial)}
              disabled={busy}
              className="koda-btn-pill h-9 w-full px-4 text-xs disabled:opacity-45"
            >
              Discard changes
            </button>
          ) : savedAt ? (
            <p className="text-center font-mono text-xs text-emerald-600 dark:text-emerald-400">Saved.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
