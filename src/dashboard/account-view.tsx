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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/error-state";
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
    <p className={cn("text-xs", message.tone === "ok" ? "text-emerald-400" : "text-red-400")}>
      {message.text}
    </p>
  );
}

function DeviceMedia({ model }: { model?: string }) {
  const photo = devicePhoto(model);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className="h-[108px] w-[84px] shrink-0 rounded-xl bg-white/[0.04] object-cover ring-1 ring-white/[0.08]"
      />
    );
  }
  const Icon = deviceIsTablet(model) ? Tablet : Smartphone;
  return (
    <div className="flex h-[108px] w-[84px] shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08]">
      <Icon className="size-8 text-zinc-500" />
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
      <div className="resend-glass-panel flex items-center justify-center gap-2 rounded-2xl p-12 text-sm text-zinc-400">
        <Loader2 className="size-4 animate-spin" /> Loading your account...
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        code="ACCOUNT UNAVAILABLE"
        title="Could not load your account"
        description="We could not fetch your KodaHosting profile from the API."
        detail={error}
        onRetry={() => void onReload()}
      />
    );
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
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">Account</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          The profile shared across the Android app, web dashboard, and extension store.
        </p>
      </div>

      <div className="resend-glass-panel rounded-2xl p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="size-20 ring-1 ring-white/[0.12]">
            <AvatarImage src={avatarUrl(me) || undefined} alt="" />
            <AvatarFallback className="bg-white/[0.08] font-display text-xl text-white">
              {avatarInitial(me)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-display text-lg font-medium text-white">
                {me?.nickname || "No nickname set"}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[11px]",
                  me?.two_fa ? "text-emerald-400" : "text-zinc-500",
                )}
              >
                <span className={cn("size-1.5 rounded-full", me?.two_fa ? "bg-emerald-400" : "bg-zinc-600")} />
                {me?.two_fa ? "2FA on" : "2FA off"}
              </span>
              {me?.mc_username ? (
                <span className="font-mono text-xs text-brand-ink">· {me.mc_username}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-400">{me?.email}</p>
            <p className="mt-2 font-mono text-xs text-zinc-500">{counts}</p>
            {since ? <p className="mt-1 text-xs text-zinc-500">{since}</p> : null}

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
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => fileInput.current?.click()}
                className="koda-btn-pill h-8 px-3.5 text-xs disabled:opacity-50"
              >
                {avatarBusy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                Change picture
              </button>
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => void removeAvatar()}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
            <div className="mt-2">
              <MessageLine message={avatarMessage} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="resend-glass-panel rounded-2xl p-6">
          <h2 className="font-display text-sm font-medium text-white">Profile</h2>
          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-xs text-zinc-400">
                Nickname
              </Label>
              <div className="flex gap-2">
                <Input
                  id="nickname"
                  maxLength={24}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveNickname();
                  }}
                  className="h-9 rounded-xl border-white/[0.09] bg-white/[0.04] text-sm text-white placeholder:text-zinc-500 focus-visible:border-white/25 focus-visible:ring-0"
                />
                <button type="button" onClick={() => void saveNickname()} className="koda-btn-black h-9 shrink-0 px-4 text-xs">
                  Save
                </button>
              </div>
              <p className="text-xs text-zinc-500">2 to 24 characters, shown in the app.</p>
              <MessageLine message={nicknameMessage} />
            </div>

            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <Label htmlFor="new-password" className="text-xs text-zinc-400">
                New password
              </Label>
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
                  className="h-9 rounded-xl border-white/[0.09] bg-white/[0.04] text-sm text-white placeholder:text-zinc-500 focus-visible:border-white/25 focus-visible:ring-0"
                />
                <button type="button" onClick={() => void changePassword()} className="koda-btn-black h-9 shrink-0 px-4 text-xs">
                  Change
                </button>
              </div>
              <p className="text-xs text-zinc-500">At least 6 characters.</p>
              <MessageLine message={passwordMessage} />
            </div>
          </div>
        </div>

        <div className="resend-glass-panel flex flex-col justify-between rounded-2xl p-6">
          <div>
            <h2 className="font-display text-sm font-medium text-white">Account settings</h2>
            <dl className="mt-4 divide-y divide-white/[0.06] text-sm">
              <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <dt className="text-zinc-400">Two-factor authentication</dt>
                <dd
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-xs",
                    me?.two_fa ? "text-emerald-400" : "text-zinc-500",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", me?.two_fa ? "bg-emerald-400" : "bg-zinc-600")} />
                  {me?.two_fa ? "Enabled" : "Off"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-zinc-400">Minecraft account</dt>
                <dd className="text-right font-mono text-xs text-zinc-200">
                  {me?.mc_username || "Not linked"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                <dt className="text-zinc-400">Email</dt>
                <dd className="truncate text-right font-mono text-xs text-zinc-200">{me?.email}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-5 text-zinc-500">
            Linking a Minecraft account, deleting the account, and two-factor settings live in the KodaHosting app under Settings -&gt; Account.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-medium tracking-[-0.02em] text-white">
            Your devices
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Every phone or tablet signed in to this account. Unlinking stops the dashboard from showing it; the app keeps its servers and settings and can link again anytime.
          </p>
        </div>

        {deviceError ? (
          <ErrorState
            compact
            title="Could not load linked devices"
            detail={deviceError}
            onRetry={() => void onReload()}
          />
        ) : null}

        {devices.length === 0 ? (
          deviceError ? null : (
            <div className="resend-glass-panel rounded-2xl p-10 text-center text-sm text-zinc-400">
              No devices linked to this account yet. Sign in with this account inside the app (Settings -&gt; Account) to link one.
            </div>
          )
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {devices.map((device) => {
              const accounts =
                (device.accounts || [])
                  .filter((account) => account.mc_username)
                  .map((account) => account.mc_username + (account.is_main ? " (main)" : ""))
                  .join(", ") || "No Minecraft account linked";
              const ram =
                device.total_ram_mb && device.free_ram_mb != null
                  ? `${device.total_ram_mb - device.free_ram_mb} / ${device.total_ram_mb} MB`
                  : "--";
              const state =
                device.app_state === "FOREGROUND"
                  ? { label: "Active", dot: "bg-emerald-400", text: "text-emerald-400" }
                  : device.app_state === "BACKGROUND"
                    ? { label: "In background", dot: "bg-amber-400", text: "text-amber-300" }
                    : { label: "Offline", dot: "bg-zinc-600", text: "text-zinc-500" };
              const name = deviceName(device.model);
              const modelNote = device.model && name !== device.model ? ` · ${device.model}` : "";

              return (
                <div key={device.app_uuid} className="resend-glass-panel rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm font-medium text-white">{name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {device.os || "Android"}
                        {modelNote}
                      </div>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px]", state.text)}>
                      <span className={cn("size-1.5 rounded-full", state.dot)} />
                      {state.label}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-4">
                    <DeviceMedia model={device.model} />
                    <ul className="min-w-0 flex-1 space-y-2 text-xs text-zinc-400">
                      <li className="flex items-start gap-2">
                        <UserRound className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
                        <span className="truncate">{accounts}</span>
                      </li>
                      <li className="flex items-center gap-2 font-mono tabular-nums">
                        <HardDrive className="size-3.5 shrink-0 text-zinc-500" />
                        {ram}
                      </li>
                      <li className="flex items-center gap-2 font-mono tabular-nums">
                        <Battery className="size-3.5 shrink-0 text-zinc-500" />
                        {device.battery != null ? `${device.battery}%` : "--"}
                        {device.charging ? " charging" : ""}
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="size-3.5 shrink-0 text-zinc-500" />
                        {relativeTime(device.last_ping)}
                      </li>
                      <li className="font-mono text-[11px] text-zinc-500">app {device.app_version || "--"}</li>
                    </ul>
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUnlinkError("");
                        setUnlinkTarget(device);
                      }}
                      className="koda-btn-pill h-8 px-3.5 text-xs"
                    >
                      Unlink device
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog open={Boolean(unlinkTarget)} onOpenChange={(open) => (open ? null : setUnlinkTarget(null))}>
        <AlertDialogContent className="rounded-2xl border-white/[0.1] bg-[#0b0b0e] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-white">Unlink this device?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              The app keeps working with its servers and settings, and you can link it again by signing in.
            </AlertDialogDescription>
            {unlinkError ? (
              <p className="text-sm text-red-400">Could not unlink: {unlinkError}</p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkBusy} className="rounded-full border-white/[0.1] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={unlinkBusy}
              className="rounded-full bg-red-600 text-white hover:bg-red-500"
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
