import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Download,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Trash2,
  Upload,
} from "lucide-react";
import { javascript } from "@codemirror/lang-javascript";
import { json as jsonLanguage } from "@codemirror/lang-json";
import { xml as xmlLanguage } from "@codemirror/lang-xml";
import { java as javaLanguage } from "@codemirror/lang-java";
import { syntaxHighlighting } from "@codemirror/language";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { strToU8, unzipSync, zipSync } from "fflate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { api, assertSafeUploadUrl } from "@/lib/api";
import {
  isSafeArchiveEntryPath,
  MAX_ARCHIVE_COMPRESSED_BYTES,
  sanitizeUnpackedArchive,
} from "@/lib/security";
import type { DevExtension, SourcePackage } from "@/developer/types";
import { formatBytes, pendingVersion, PERMISSIONS } from "@/developer/types";
import { publishErrorText, publishVersion } from "@/developer/publish";
import { runPreflight } from "@/developer/preflight";
import { PreflightPanel } from "@/developer/preflight-panel";
import { cn } from "@/lib/utils";

const editorTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", fontSize: "13px" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "12px 0" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--border)",
    color: "var(--muted-foreground)",
  },
  ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.04)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-scroller": { fontFamily: "var(--font-mono)" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "rgba(255,255,255,0.14) !important" },
});

const INPUT_CLASS =
  "rounded-xl border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500";

function extensionOf(path: string): string {
  const name = path.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

function looksText(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function languageFor(path: string) {
  switch (extensionOf(path)) {
    case "json":
    case "map":
      return jsonLanguage();
    case "js":
    case "mjs":
    case "cjs":
    case "jsx":
    case "ts":
    case "tsx":
      return javascript({ jsx: true, typescript: extensionOf(path).startsWith("ts") });
    case "xml":
    case "svg":
    case "html":
    case "htm":
      return xmlLanguage();
    case "java":
      return javaLanguage();
    default:
      return [];
  }
}

function bumpPatch(version?: string): string {
  const parts = (version || "0.0.0").split(".").map((part) => parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[parts.length - 1] += 1;
  return parts.join(".");
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [], isFile: false };
  for (const path of paths) {
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let child = node.children.find((entry) => entry.name === part);
      if (!child) {
        child = { name: part, path: parts.slice(0, index + 1).join("/"), children: [], isFile };
        node.children.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1));
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}

function FileGlyph({ path }: { path: string }) {
  const ext = extensionOf(path);
  if (["js", "mjs", "ts", "tsx", "jsx", "java", "kt", "json"].includes(ext)) {
    return <FileCode2 className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />;
  }
  return <FileText className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />;
}

function Tree({ nodes, selected, dirty, onSelect }: {
  nodes: TreeNode[];
  selected: string;
  dirty: Set<string>;
  onSelect: (path: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) =>
        node.isFile ? (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                selected === node.path
                  ? "bg-black/[0.07] text-zinc-950 dark:bg-white/[0.08] dark:text-white"
                  : "text-zinc-600 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.04]",
              )}
              style={{ paddingLeft: `${8 + node.path.split("/").length * 10}px` }}
            >
              <FileGlyph path={node.path} />
              <span className="min-w-0 flex-1 truncate font-mono">{node.name}</span>
              {dirty.has(node.path) ? <span className="size-1.5 rounded-full bg-brand" /> : null}
            </button>
          </li>
        ) : (
          <li key={node.path}>
            <div
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500"
              style={{ paddingLeft: `${8 + node.path.split("/").length * 10}px` }}
            >
              <Folder className="size-3.5 shrink-0" />
              <span className="truncate font-mono">{node.name}</span>
            </div>
            <Tree nodes={node.children} selected={selected} dirty={dirty} onSelect={onSelect} />
          </li>
        ),
      )}
    </ul>
  );
}

export function CodeEditor({ ext, onPublished }: { ext: DevExtension; onPublished: () => void }) {
  const [files, setFiles] = useState<Record<string, Uint8Array>>({});
  const [baseline, setBaseline] = useState<Record<string, Uint8Array>>({});
  const [source, setSource] = useState<SourcePackage | null>(null);
  const [selected, setSelected] = useState("manifest.json");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newPath, setNewPath] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);

  const dirty = useMemo(() => {
    const changed = new Set<string>();
    for (const path of Object.keys(files)) {
      if (baseline[path] !== files[path]) changed.add(path);
    }
    for (const path of Object.keys(baseline)) {
      if (!(path in files)) changed.add(path);
    }
    return changed;
  }, [files, baseline]);

  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);
  const pending = pendingVersion(ext);
  const binary = useMemo(() => {
    const bytes = files[selected];
    if (!bytes) return null;
    return looksText(bytes) === null ? bytes : null;
  }, [files, selected]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const src = await api<SourcePackage>(
        `/v1/me/extensions/${encodeURIComponent(ext.ext_id)}/source`,
      );
      assertSafeUploadUrl(src.url);
      const res = await fetch(src.url);
      if (!res.ok) throw new Error(`Package download failed (${res.status}).`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_ARCHIVE_COMPRESSED_BYTES) {
        throw new Error("Package exceeds maximum allowed compressed size (20 MB).");
      }
      const unpacked = unzipSync(bytes);
      const unzipped = sanitizeUnpackedArchive(unpacked);
      setFiles(unzipped);
      setBaseline(unzipped);
      setSource(src);
      const manifestPath =
        Object.keys(unzipped).find((path) => path === "manifest.json") ||
        Object.keys(unzipped).find((path) => path.endsWith("/manifest.json")) ||
        Object.keys(unzipped).find((path) => looksText(unzipped[path]) !== null) ||
        "";
      setSelected(manifestPath);
      setContent(manifestPath ? looksText(unzipped[manifestPath]) ?? "" : "");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [ext.ext_id]);

  useEffect(() => {
    void load();
  }, [load]);

  function select(path: string) {
    setSelected(path);
    const bytes = files[path];
    setContent(bytes ? looksText(bytes) ?? "" : "");
  }

  function edit(next: string) {
    setContent(next);
    const bytes = strToU8(next);
    setFiles((current) => ({ ...current, [selected]: bytes }));
  }

  function addFile(path: string, bytes: Uint8Array) {
    const clean = path.replace(/^\/+/, "").trim();
    if (!clean) return;
    if (!/^[A-Za-z0-9._\-/]+$/.test(clean) || !isSafeArchiveEntryPath(clean)) {
      setError("Paths must stay inside the package using letters, numbers, dots, dashes and slashes.");
      return;
    }
    if (Object.prototype.hasOwnProperty.call(files, clean)) {
      setError(`${clean} already exists.`);
      return;
    }
    setFiles((current) => ({ ...current, [clean]: bytes }));
    setSelected(clean);
    setContent(looksText(bytes) ?? "");
    setError("");
  }

  function deleteFile() {
    setFiles((current) => {
      const next = { ...current };
      delete next[selected];
      return next;
    });
    setDeleteOpen(false);
    const remaining = Object.keys(files).filter((path) => path !== selected).sort();
    setSelected(remaining[0] || "");
    setContent(remaining[0] ? looksText(files[remaining[0]]) ?? "" : "");
  }

  function renameFile() {
    const clean = renameValue.replace(/^\/+/, "").trim();
    if (!clean || !files[selected] || clean === selected) {
      setRenameOpen(false);
      return;
    }
    if (!/^[A-Za-z0-9._\-/]+$/.test(clean) || !isSafeArchiveEntryPath(clean)) {
      setError("Paths must stay inside the package using letters, numbers, dots, dashes and slashes.");
      return;
    }
    if (Object.prototype.hasOwnProperty.call(files, clean)) {
      setError(`${clean} already exists.`);
      return;
    }
    setFiles((current) => {
      const next = { ...current, [clean]: current[selected] };
      delete next[selected];
      return next;
    });
    setSelected(clean);
    setRenameOpen(false);
    setError("");
  }

  function download() {
    const zipped = zipSync(files, { level: 9 });
    const blob = new Blob([zipped.slice().buffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ext.ext_id}-${source?.version_code ?? "package"}.kodaext`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="resend-glass-panel flex items-center justify-center gap-2 rounded-2xl p-16 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="size-4 animate-spin" /> Loading the package...
      </div>
    );
  }

  if (error && !source) {
    return (
      <div className="resend-glass-panel space-y-3 rounded-2xl p-6">
        <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
          The package could not be loaded.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
        <p className="text-xs text-zinc-500">
          Only extensions with at least one uploaded release have a package to edit.
        </p>
        <button type="button" onClick={() => void load()} className="koda-btn-pill h-8 px-3.5 text-xs">
          <RefreshCw className="size-3.5" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="resend-glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-sm font-medium text-zinc-950 dark:text-white">
                Code editor
              </h2>
              <span className="font-mono text-xs text-zinc-500">
                v{source?.version} ({source?.version_code})
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Edits stay local until you publish them as a new release. The manifest gets the new version and version code automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadOpen(true)}
              disabled={dirty.size > 0}
              className="koda-btn-pill h-8 px-3 text-xs disabled:opacity-45"
            >
              <RefreshCw className="size-3.5" /> Reload
            </button>
            <button
              type="button"
              onClick={download}
              className="koda-btn-pill h-8 px-3 text-xs"
            >
              <Download className="size-3.5" /> Download
            </button>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              disabled={Object.keys(files).length === 0 || Boolean(pending)}
              title={pending ? `v${pending.version} is already in review` : undefined}
              className="koda-btn-black h-8 px-3.5 text-xs disabled:opacity-45"
            >
              <Rocket className="size-3.5" /> Publish update
            </button>
          </div>
        </div>
        {dirty.size > 0 ? (
          <p className="mt-3 flex items-center gap-2 font-mono text-xs text-zinc-500">
            <span className="size-1.5 rounded-full bg-brand" />
            {dirty.size} changed {dirty.size === 1 ? "file" : "files"} · package{" "}
            {formatBytes(Object.values(files).reduce((sum, bytes) => sum + bytes.byteLength, 0))}
          </p>
        ) : null}
        {pending ? (
          <p className="mt-3 rounded-xl border border-dashed border-amber-500/35 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
            v{pending.version} is in review. Publishing editor changes unlocks once reviewed.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        <div className="resend-glass-panel rounded-2xl p-3 lg:self-start">
          <div className="flex items-center justify-between gap-2 px-1.5 pb-2">
            <p className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-zinc-500 uppercase">
              Package
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="New file"
                onClick={() => {
                  setNewPath("");
                  setNewOpen(true);
                }}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/[0.05] hover:text-zinc-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Upload file"
                onClick={() => uploadInput.current?.click()}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/[0.05] hover:text-zinc-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <Upload className="size-3.5" />
              </button>
              <input
                ref={uploadInput}
                type="file"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const picked = Array.from(event.target.files || []);
                  void (async () => {
                    for (const file of picked) {
                      const path = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
                      addFile(path, new Uint8Array(await file.arrayBuffer()));
                    }
                  })();
                  event.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {Object.keys(files).length === 0 ? (
              <p className="px-2 py-4 text-xs text-zinc-500">No files.</p>
            ) : (
              <Tree nodes={tree} selected={selected} dirty={dirty} onSelect={select} />
            )}
          </div>

          {selected ? (
            <div className="mt-2 flex items-center gap-1 border-t border-zinc-200/70 pt-2 dark:border-white/[0.06]">
              <button
                type="button"
                className="flex-1 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-600 transition-colors hover:bg-black/[0.04] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                onClick={() => {
                  setRenameValue(selected);
                  setRenameOpen(true);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                aria-label="Delete file"
                onClick={() => setDeleteOpen(true)}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="resend-glass-panel min-w-0 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-2.5 dark:border-white/[0.06]">
            <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-zinc-900 dark:text-zinc-100">
              <FolderOpen className="size-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{selected || "No file selected"}</span>
              {dirty.has(selected) ? (
                <span className="font-mono text-[11px] text-brand-ink">· modified</span>
              ) : null}
            </div>
            {selected && files[selected] ? (
              <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                {formatBytes(files[selected].byteLength)}
              </span>
            ) : null}
          </div>

          {!selected ? (
            <p className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Pick a file or create one.
            </p>
          ) : binary ? (
            <div className="flex flex-col items-center justify-center gap-2 p-16 text-center">
              <FileText className="size-6 text-zinc-500" />
              <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">Binary file</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {binary.byteLength} bytes. The editor only shows text; this file stays in the package untouched.
              </p>
            </div>
          ) : (
            <div className="bg-[#09090c] text-zinc-100">
              <CodeMirror
                key={selected}
                value={content}
                height="520px"
                theme="dark"
                extensions={[
                  languageFor(selected),
                  syntaxHighlighting(oneDarkHighlightStyle),
                  editorTheme,
                ]}
                onChange={edit}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  searchKeymap: true,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        The app checks manifest.json before installing a package. Keep the id, version, and permissions consistent.
      </p>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">New file</DialogTitle>
            <DialogDescription>Relative to the package root, for example ui/settings.html.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-file" className="text-xs text-zinc-600 dark:text-zinc-400">
              Path
            </Label>
            <Input
              id="new-file"
              value={newPath}
              onChange={(event) => setNewPath(event.target.value)}
              placeholder="ui/page.html"
              className={cn("font-mono", INPUT_CLASS)}
            />
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setNewOpen(false)} className="koda-btn-pill h-9 px-4 text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                addFile(newPath, strToU8(""));
                if (newPath.trim()) setNewOpen(false);
              }}
              className="koda-btn-black h-9 px-4 text-xs"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Rename file</DialogTitle>
            <DialogDescription>The file keeps its content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-file" className="text-xs text-zinc-600 dark:text-zinc-400">
              Path
            </Label>
            <Input
              id="rename-file"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className={cn("font-mono", INPUT_CLASS)}
            />
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setRenameOpen(false)} className="koda-btn-pill h-9 px-4 text-xs">
              Cancel
            </button>
            <button type="button" onClick={renameFile} className="koda-btn-black h-9 px-4 text-xs">
              Rename
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete {selected}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only from this draft. The published package stays untouched until your next release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-500"
              onClick={(event) => {
                event.preventDefault();
                deleteFile();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reloadOpen} onOpenChange={setReloadOpen}>
        <AlertDialogContent className="rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Discard local changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The editor reloads the newest published package. Files you added, renamed, or edited in the browser will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(event) => {
                event.preventDefault();
                setReloadOpen(false);
                void load();
              }}
            >
              Reload package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditorPublish
        open={publishOpen}
        onOpenChange={setPublishOpen}
        ext={ext}
        files={files}
        source={source}
        onPublished={() => {
          onPublished();
          void load();
        }}
      />
    </div>
  );
}

function EditorPublish({
  open,
  onOpenChange,
  ext,
  files,
  source,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ext: DevExtension;
  files: Record<string, Uint8Array>;
  source: SourcePackage | null;
  onPublished: () => void;
}) {
  const [version, setVersion] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [changelog, setChangelog] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const manifestPath = useMemo(
    () =>
      Object.keys(files).find((path) => path === "manifest.json") ||
      Object.keys(files).find((path) => path.endsWith("/manifest.json")) ||
      "",
    [files],
  );

  const manifest = useMemo(() => {
    if (!manifestPath || !files[manifestPath]) return null;
    try {
      return JSON.parse(looksText(files[manifestPath]) || "{}") as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [files, manifestPath]);

  const suggestedCode = Math.max(
    source?.version_code ?? 0,
    ...ext.versions.map((entry) => entry.version_code),
  ) + 1;

  const effectiveFiles = useMemo(() => {
    if (!manifest || !manifestPath) return null;
    const nextFiles: Record<string, Uint8Array> = { ...files };
    nextFiles[manifestPath] = strToU8(
      JSON.stringify({
        ...manifest,
        id: ext.ext_id,
        version: version.trim(),
        versionCode: parseInt(versionCode, 10) || Number(manifest.versionCode ?? 0),
        permissions,
      }, null, 2) + "\n",
    );
    return nextFiles;
  }, [files, manifest, manifestPath, ext.ext_id, version, versionCode, permissions]);

  const report = useMemo(() => {
    if (!effectiveFiles || !manifest) return null;
    return runPreflight(ext, effectiveFiles, {
      version: version.trim(),
      versionCode: parseInt(versionCode, 10) || 0,
      changelog,
      permissions,
      minAppVersion: Number(manifest.minAppVersion || 0),
    });
  }, [effectiveFiles, manifest, ext, version, versionCode, changelog, permissions]);

  useEffect(() => {
    if (!open) return;
    setVersion(bumpPatch(typeof manifest?.version === "string" ? manifest.version : source?.version));
    setVersionCode(String(suggestedCode));
    setChangelog("");
    setPermissions(Array.isArray(manifest?.permissions) ? (manifest.permissions as string[]) : []);
    setError("");
    setBusy(false);
  }, [open, manifest, source, suggestedCode]);

  async function publish() {
    if (pendingVersion(ext)) {
      setError("A version of this extension is already in review. Wait for the decision.");
      return;
    }
    if (!manifestPath || !manifest) {
      setError("manifest.json is missing or not valid JSON.");
      return;
    }
    const code = parseInt(versionCode, 10);
    if (!/^[0-9]+(\.[0-9]+)*$/.test(version.trim())) {
      setError("The version must look like 1.2.0.");
      return;
    }
    if (!code) {
      setError("A version code is required.");
      return;
    }
    if (report && !report.ok) {
      setError(`Fix the ${report.fails} blocking check${report.fails === 1 ? "" : "s"} before publishing.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const nextManifest = {
        ...manifest,
        id: ext.ext_id,
        version: version.trim(),
        versionCode: code,
        permissions,
      };
      const minAppVersion = Number(manifest.minAppVersion || 0);
      const nextFiles: Record<string, Uint8Array> = { ...files };
      nextFiles[manifestPath] = strToU8(JSON.stringify(nextManifest, null, 2) + "\n");
      const zipped = zipSync(nextFiles, { level: 9 });
      await publishVersion(ext, zipped, {
        version: version.trim(),
        versionCode: code,
        changelog: changelog.trim(),
        permissions,
        minAppVersion,
      });
      onPublished();
      onOpenChange(false);
    } catch (err) {
      setError(publishErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Publish edited package</DialogTitle>
          <DialogDescription>
            Creates a new release and submits it for review. Your current store listing stays unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ed-version" className="text-xs text-zinc-600 dark:text-zinc-400">
                Version name
              </Label>
              <Input
                id="ed-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-code" className="text-xs text-zinc-600 dark:text-zinc-400">
                Version code
              </Label>
              <Input
                id="ed-code"
                value={versionCode}
                onChange={(event) => setVersionCode(event.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ed-changelog" className="text-xs text-zinc-600 dark:text-zinc-400">
              What changed
            </Label>
            <Textarea
              id="ed-changelog"
              value={changelog}
              rows={3}
              maxLength={4000}
              onChange={(event) => setChangelog(event.target.value)}
              placeholder="Shown to users with the update."
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-600 dark:text-zinc-400">Permissions</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PERMISSIONS.map((permission) => {
                const checked = permissions.includes(permission);
                return (
                  <button
                    key={permission}
                    type="button"
                    onClick={() =>
                      setPermissions((current) =>
                        checked ? current.filter((item) => item !== permission) : [...current, permission],
                      )
                    }
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left font-mono text-xs transition-colors",
                      checked
                        ? "border-brand/60 bg-brand/10 text-zinc-950 dark:text-white"
                        : "border-zinc-200 text-zinc-600 hover:bg-black/[0.03] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-white/[0.04]",
                    )}
                  >
                    {permission}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              Written to manifest.json too. Keep this identical to the permissions your code actually uses.
            </p>
          </div>

          {report ? <PreflightPanel report={report} compact /> : null}

          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="koda-btn-pill h-9 px-4 text-xs disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={busy}
            className="koda-btn-black h-9 px-4 text-xs disabled:opacity-45"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronRight className="size-3.5" />}
            Send to review
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
