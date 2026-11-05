import { useEffect, useRef, useState } from "react";
import {
  Battery,
  Clock,
  HardDrive,
  ImagePlus,
  Loader2,
  Smartphone,
  Tablet,
  Trash2,
  UserRound,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, assertSafeUploadUrl } from "@/lib/api";
import { formatDate, plural, relativeTime } from "@/lib/format";
import type { Me } from "@/lib/server-status";
import { avatarInitial, avatarUrl, deviceIsTablet, deviceName, devicePhoto } from "@/lib/server-status";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { DeviceRow } from "@/dashboard/types";

type Message = { tone: "ok" | "err"; text: string } | null;

function MessageLine({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p className={cn("text-xs", message.tone === "ok" ? "text-ok" : "text-destructive")}>
      {message.text}
    </p>
  );
}

function DeviceMedia({ model }: { model?: string }) {
  const photo = devicePhoto(model);
  if (photo) {
    return <img src={photo} alt="" className="h-[108px] w-[84px] shrink-0 rounded-lg border object-cover" />;
  }
  const Icon = deviceIsTablet(model) ? Tablet : Smartphone;
  return (
    <div className="flex h-[108px] w-[84px] shrink-0 items-center justify-center rounded-lg border bg-muted">
      <Icon className="size-9 text-muted-foreground" />
    </div>
  );
}

export function AccountView({
  me,
  devices,
  loading,
  error,
  deviceError,
  onReload,
}: {
  me: Me | null;
  devices: DeviceRow[];
  loading: boolean;
  error: string;
  deviceError: string;
  onReload: () => Promise<void>;
}) {
  const [nickname, setNickname] = useState(me?.nickname || "");
  const [nicknameMessage, setNicknameMessage] = useState<Message>(null);
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [avatarMessage, setAvatarMessage] = useState<Message>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<DeviceRow | null>(null);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [unlinkError, setUnlinkError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNickname(me?.nickname || "");
  }, [me?.nickname]);

  async function uploadAvatar(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({ tone: "err", text: "The picture must be under 2 MB." });
      return;
    }
    setAvatarBusy(true);
    setAvatarMessage(null);
    try {
      const data = await api<{ upload: { signed_url: string }; public_url: string }>("/v1/me/avatar", {
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
      if (!put.ok) throw new Error(`upload failed (${put.status})`);
      await api("/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: data.public_url }),
      });
      setAvatarMessage({ tone: "ok", text: "Picture saved." });
      await onReload();
    } catch (err) {
      setAvatarMessage({ tone: "err", text: (err as Error).message });
    } finally {
      setAvatarBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarMessage(null);
    try {
      await api("/v1/me/avatar", { method: "DELETE" });
      setAvatarMessage({ tone: "ok", text: "Picture removed." });
      await onReload();
    } catch (err) {
      setAvatarMessage({ tone: "err", text: (err as Error).message });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveNickname() {
    const value = nickname.trim();
    if (value.length < 2 || value.length > 24) {
      setNicknameMessage({ tone: "err", text: "The nickname needs 2 to 24 characters." });
      return;
    }
    setNicknameMessage(null);
    try {
      await api("/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: value }),
      });
      setNicknameMessage({ tone: "ok", text: "Nickname saved." });
      await onReload();
    } catch (err) {
      const message = (err as Error).message;
      setNicknameMessage({
        tone: "err",
        text:
          message === "account_not_linked"
            ? "Link a Minecraft account in the app first."
            : message,
      });
    }
  }

  async function changePassword() {
    if (password.length < 6) {
      setPasswordMessage({ tone: "err", text: "The password needs at least 6 characters." });
      return;
    }
    setPasswordMessage(null);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setPasswordMessage({ tone: "err", text: authError.message });
      return;
    }
    setPassword("");
    setPasswordMessage({ tone: "ok", text: "Password changed." });
  }

  async function unlink() {
    if (!unlinkTarget) return;
    setUnlinkBusy(true);
    setUnlinkError("");
    try {
      await api(`/v1/me/devices/${encodeURIComponent(unlinkTarget.app_uuid)}/unlink`, { method: "POST" });
      setUnlinkTarget(null);
      await onReload();
    } catch (err) {
      setUnlinkError((err as Error).message);
    } finally {
      setUnlinkBusy(false);
    }
  }

  if (loading && !me) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading the account…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the account: {error}</p>;
  }

  const counts = [
    plural(me?.server_count ?? 0, "server"),
    plural(me?.device_count ?? 0, "device"),
    plural(me?.extension_count ?? 0, "extension submission"),
  ].join(" · ");

  const since = [
    me?.member_since ? `Member since ${formatDate(me.member_since)}` : "",
    me?.linked_since ? `linked with the app since ${formatDate(me.linked_since)}` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The profile the app, the dashboard and the store share.
        </p>
      </div>

      <Card className="gap-0 p-6 shadow-none">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="size-20">
            <AvatarImage src={avatarUrl(me) || undefined} alt="" />
            <AvatarFallback className="text-xl">{avatarInitial(me)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{me?.nickname || "No nickname set"}</h2>
              <Badge variant="outline" className="font-normal">
                {me?.two_fa ? "2FA on" : "2FA off"}
              </Badge>
              {me?.mc_username ? (
                <Badge variant="secondary" className="font-normal">
                  {me.mc_username}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{me?.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">{counts}</p>
            {since ? <p className="mt-1 text-xs text-muted-foreground">{since}</p> : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {me?.mc_username
                ? `Minecraft account: ${me.mc_username} (linked)`
                : "No Minecraft account linked yet."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={avatarBusy}
                onClick={() => fileInput.current?.click()}
              >
                {avatarBusy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Change picture
              </Button>
              <Button variant="ghost" size="sm" disabled={avatarBusy} onClick={() => void removeAvatar()}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
            <div className="mt-2">
              <MessageLine message={avatarMessage} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 p-6 shadow-none">
          <h2 className="text-sm font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <div className="flex gap-2">
                <Input
                  id="nickname"
                  maxLength={24}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveNickname();
                  }}
                />
                <Button variant="outline" onClick={() => void saveNickname()}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">2 to 24 characters, shown in the app.</p>
              <MessageLine message={nicknameMessage} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void changePassword();
                  }}
                />
                <Button variant="outline" onClick={() => void changePassword()}>
                  Change
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">At least 6 characters.</p>
              <MessageLine message={passwordMessage} />
            </div>
          </div>
        </Card>

        <Card className="gap-0 p-6 shadow-none">
          <h2 className="text-sm font-semibold">Account settings</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Two-factor authentication</dt>
              <dd>
                <Badge variant="outline" className={cn("font-normal", me?.two_fa && "tone-online")}>
                  {me?.two_fa ? "On" : "Off"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Minecraft account</dt>
              <dd className="text-right">{me?.mc_username || "not linked"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate text-right">{me?.email}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t pt-4 text-xs leading-5 text-muted-foreground">
            Linking a Minecraft account, deleting the account and the two-factor settings live in the
            KodaHosting app under Settings → Account.
          </p>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Your devices</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every device signed in to this account. Unlinking stops the dashboard from showing it; the
          app keeps its servers and settings and can be linked again by signing in.
        </p>

        {deviceError ? (
          <p className="mt-3 text-sm text-destructive">Could not load the devices: {deviceError}</p>
        ) : null}

        {devices.length === 0 ? (
          deviceError ? null : (
            <p className="mt-4 rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
              No devices linked to this account yet. Sign in with this account in the app (Settings,
              Account) to link one.
            </p>
          )
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {devices.map((device) => {
              const accounts =
                (device.accounts || [])
                  .filter((account) => account.mc_username)
                  .map((account) => account.mc_username + (account.is_main ? " (main)" : ""))
                  .join(", ") || "no Minecraft account linked";
              const ram =
                device.total_ram_mb && device.free_ram_mb != null
                  ? `${device.total_ram_mb - device.free_ram_mb} / ${device.total_ram_mb} MB`
                  : "--";
              const state =
                device.app_state === "FOREGROUND"
                  ? { label: "active", tone: "tone-online" }
                  : device.app_state === "BACKGROUND"
                    ? { label: "in background", tone: "tone-pending" }
                    : { label: "offline", tone: "border-border bg-muted text-muted-foreground" };
              const name = deviceName(device.model);
              const modelNote = device.model && name !== device.model ? ` · ${device.model}` : "";

              return (
                <Card key={device.app_uuid} className="gap-0 p-5 shadow-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {device.os || "Android"}
                        {modelNote}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("font-normal", state.tone)}>
                      {state.label}
                    </Badge>
                  </div>

                  <div className="mt-4 flex gap-4">
                    <DeviceMedia model={device.model} />
                    <ul className="min-w-0 flex-1 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <UserRound className="mt-0.5 size-3.5 shrink-0" />
                        <span className="truncate">{accounts}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <HardDrive className="size-3.5 shrink-0" />
                        {ram}
                      </li>
                      <li className="flex items-center gap-2">
                        <Battery className="size-3.5 shrink-0" />
                        {device.battery != null ? `${device.battery}%` : "--"}
                        {device.charging ? " charging" : ""}
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="size-3.5 shrink-0" />
                        {relativeTime(device.last_ping)}
                      </li>
                      <li className="text-[11px]">app {device.app_version || "--"}</li>
                    </ul>
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUnlinkError("");
                        setUnlinkTarget(device);
                      }}
                    >
                      Unlink device
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog open={Boolean(unlinkTarget)} onOpenChange={(open) => (open ? null : setUnlinkTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink this device?</AlertDialogTitle>
            <AlertDialogDescription>
              The app keeps working with its servers and settings, and you can link it again by
              signing in.
            </AlertDialogDescription>
            {unlinkError ? (
              <p className="text-sm text-destructive">Could not unlink: {unlinkError}</p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkBusy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={unlinkBusy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void unlink();
              }}
            >
              {unlinkBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
