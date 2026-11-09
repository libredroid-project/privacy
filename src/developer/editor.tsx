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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import type { DevExtension, SourcePackage } from "@/developer/types";
import { formatBytes, pendingVersion, PERMISSIONS } from "@/developer/types";
import { publishErrorText, publishVersion } from "@/developer/publish";
import { runPreflight } from "@/developer/preflight";
import { PreflightPanel } from "@/developer/preflight-panel";

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
    return <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <FileText className="size-3.5 shrink-0 text-muted-foreground" />;
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
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                selected === node.path ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
              }`}
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
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground"
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
      const unpacked = unzipSync(bytes);
      // zip directory entries ("ui/") are not files and would show up as empty rows
      const unzipped = Object.fromEntries(
        Object.entries(unpacked).filter(([path]) => !path.endsWith("/")),
      );
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
    if (!/^[A-Za-z0-9._\-/]+$/.test(clean)) {
      setError("Paths may use letters, numbers, dots, dashes and slashes.");
      return;
    }
    if (clean.includes("..")) {
      setError("The path must stay inside the package.");
      return;
    }
    if (files[clean]) {
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
    if (files[clean]) {
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
      <Card className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground shadow-none">
        <Loader2 className="size-4 animate-spin" /> Loading the package…
      </Card>
    );
  }

  if (error && !source) {
    return (
      <Card className="gap-3 p-6 shadow-none">
        <p className="text-sm font-medium">The package could not be loaded.</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Only extensions with at least one uploaded release have a package to edit.
        </p>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0 p-5 shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Code editor</h2>
              <Badge variant="outline" className="font-mono font-normal">
                v{source?.version} ({source?.version_code})
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Edits stay local until you publish them as a new release. The manifest gets the new
              version and version code automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setReloadOpen(true)} disabled={dirty.size > 0}>
              <RefreshCw className="size-4" /> Reload
            </Button>
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="size-4" /> Download
            </Button>
            <Button
              size="sm"
              onClick={() => setPublishOpen(true)}
              disabled={Object.keys(files).length === 0 || Boolean(pending)}
              title={pending ? `v${pending.version} is already in review` : undefined}
            >
              <Rocket className="size-4" /> Publish update
            </Button>
          </div>
        </div>
        {dirty.size > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            {dirty.size} changed {dirty.size === 1 ? "file" : "files"} · package{" "}
            {formatBytes(Object.values(files).reduce((sum, bytes) => sum + bytes.byteLength, 0))}
          </p>
        ) : null}
        {pending ? (
          <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            v{pending.version} is in review. Publishing the editor changes unlocks after the decision.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        <Card className="gap-0 p-3 shadow-none lg:self-start">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Package
            </p>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="New file"
                onClick={() => {
                  setNewPath("");
                  setNewOpen(true);
                }}
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Upload file"
                onClick={() => uploadInput.current?.click()}
              >
                <Upload className="size-3.5" />
              </Button>
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
              <p className="px-2 py-4 text-xs text-muted-foreground">No files.</p>
            ) : (
              <Tree nodes={tree} selected={selected} dirty={dirty} onSelect={select} />
            )}
          </div>

          {selected ? (
            <div className="mt-2 flex items-center gap-1 border-t pt-2">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 justify-start text-xs"
                onClick={() => {
                  setRenameValue(selected);
                  setRenameOpen(true);
                }}
              >
                Rename
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete file"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="min-w-0 gap-0 overflow-hidden shadow-none">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
              <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected || "No file selected"}</span>
              {dirty.has(selected) ? (
                <Badge variant="outline" className="font-normal">
                  changed
                </Badge>
              ) : null}
            </div>
            {selected && files[selected] ? (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatBytes(files[selected].byteLength)}
              </span>
            ) : null}
          </div>

          {!selected ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Pick a file or create one.
            </p>
          ) : binary ? (
            <div className="flex flex-col items-center justify-center gap-2 p-16 text-center">
              <FileText className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Binary file</p>
              <p className="text-sm text-muted-foreground">
                {binary.byteLength} bytes. The editor only shows text; the file stays in the package
                untouched.
              </p>
            </div>
          ) : (
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
          )}
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        The app checks manifest.json before it installs a package. A broken manifest only fails at
        review, so keep the id, version and permissions consistent.
      </p>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New file</DialogTitle>
            <DialogDescription>Relative to the package root, for example ui/settings.html.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-file">Path</Label>
            <Input
              id="new-file"
              value={newPath}
              onChange={(event) => setNewPath(event.target.value)}
              placeholder="ui/page.html"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                addFile(newPath, strToU8(""));
                if (newPath.trim()) setNewOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>The file keeps its content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-file">Path</Label>
            <Input
              id="rename-file"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={renameFile}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only from this draft. The published package stays untouched until the next release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard the local changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The editor loads the newest published package again. Files you added, renamed or edited
              in the browser are gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Publish the edited package</DialogTitle>
          <DialogDescription>
            This creates a new release and sends it to review. The current store listing stays as it
            is.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ed-version">Version name</Label>
              <Input
                id="ed-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-code">Version code</Label>
              <Input
                id="ed-code"
                value={versionCode}
                onChange={(event) => setVersionCode(event.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ed-changelog">What changed</Label>
            <Textarea
              id="ed-changelog"
              value={changelog}
              rows={3}
              maxLength={4000}
              onChange={(event) => setChangelog(event.target.value)}
              placeholder="Shown to users with the update."
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
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
                    className={`rounded-md border px-2.5 py-2 text-left font-mono text-xs transition-colors ${
                      checked ? "border-brand/60 bg-brand-soft/10" : "text-muted-foreground hover:bg-accent/40"
                    }`}
                  >
                    {permission}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Also written to manifest.json. Keep it identical to the permissions the code really uses.
            </p>
          </div>

          {report ? <PreflightPanel report={report} compact /> : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void publish()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
            Send to review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
