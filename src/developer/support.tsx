import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  XCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { DevExtension } from "@/developer/types";
import { formatDateTime, statusDotClasses } from "@/developer/types";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  created_at: string;
  reference_id?: string | null;
  title: string;
  status: string;
  last_message?: string | null;
  last_message_at?: string | null;
  last_message_admin?: boolean;
  awaiting_support?: boolean;
}

interface Message {
  id: string;
  created_at: string;
  sender_uuid: string;
  message: string;
  is_admin: boolean;
}

const ERROR_TEXT: Record<string, string> = {
  too_many_tickets: "You already have 5 open developer tickets. Wait for an answer or close one.",
  invalid_title: "Write a subject with at least 3 characters.",
  invalid_message: "Write a message with at least 5 characters.",
  ticket_closed: "This ticket is closed. Open a new one.",
  not_found: "The ticket was not found.",
};

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return ERROR_TEXT[message] || message;
}

function TicketStatusDot({ status }: { status: string }) {
  const tone = statusDotClasses(status);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-medium", tone.text)}>
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  extensions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensions: DevExtension[];
  onCreated: (ticket: Ticket) => void;
}) {
  const [title, setTitle] = useState("");
  const [extensionId, setExtensionId] = useState("none");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setExtensionId("none");
    setMessage("");
    setBusy(false);
    setError("");
  }, [open]);

  async function submit() {
    if (title.trim().length < 3) {
      setError("Write a subject with at least 3 characters.");
      return;
    }
    if (message.trim().length < 5) {
      setError("Write a message with at least 5 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ ticket: Ticket }>("/v1/me/developer/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          extension_id: extensionId === "none" ? null : extensionId,
        }),
      });
      onCreated(data.ticket);
      onOpenChange(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-200 bg-white text-zinc-950 dark:border-white/[0.1] dark:bg-[#0b0b0e] dark:text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">New support ticket</DialogTitle>
          <DialogDescription className="text-zinc-600 dark:text-zinc-400">
            No e-mail needed. Replies show up here and in the KodaHosting app when this account is linked to a device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-title" className="text-xs text-zinc-600 dark:text-zinc-400">
              Subject
            </Label>
            <Input
              id="ticket-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="For example: review rejected my theme"
              className="rounded-xl border-zinc-200 bg-white dark:border-white/[0.09] dark:bg-white/[0.04]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-extension" className="text-xs text-zinc-600 dark:text-zinc-400">
              Extension
            </Label>
            <Select value={extensionId} onValueChange={setExtensionId}>
              <SelectTrigger
                id="ticket-extension"
                className="w-full rounded-xl border-zinc-200 bg-white dark:border-white/[0.09] dark:bg-white/[0.04]"
              >
                <SelectValue placeholder="Not about one extension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not about one extension</SelectItem>
                {extensions.map((ext) => (
                  <SelectItem key={ext.ext_id} value={ext.ext_id}>
                    {ext.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-message" className="text-xs text-zinc-600 dark:text-zinc-400">
              Message
            </Label>
            <Textarea
              id="ticket-message"
              value={message}
              rows={7}
              maxLength={4000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What happened, which version, and what did you expect?"
              className="rounded-xl border-zinc-200 bg-white dark:border-white/[0.09] dark:bg-white/[0.04]"
            />
          </div>

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
            className="koda-btn-pill h-9 px-4 text-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="koda-btn-black h-9 px-4 text-xs disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquare className="size-3.5" />}
            Open ticket
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketDetail({
  ticket,
  onBack,
  onChanged,
}: {
  ticket: Ticket;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [status, setStatus] = useState(ticket.status);

  const load = useCallback(async () => {
    try {
      const data = await api<{ ticket: Ticket; messages: Message[] }>(
        `/v1/me/developer/tickets/${encodeURIComponent(ticket.id)}`,
      );
      setMessages(data.messages || []);
      setStatus(data.ticket.status);
      setError("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/v1/me/developer/tickets/${encodeURIComponent(ticket.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      setReply("");
      setStatus("OPEN");
      await load();
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function closeTicket() {
    setBusy(true);
    setError("");
    try {
      await api(`/v1/me/developer/tickets/${encodeURIComponent(ticket.id)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      setStatus("CLOSED");
      setCloseOpen(false);
      await load();
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> All tickets
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display text-xl font-medium tracking-[-0.02em] text-zinc-950 dark:text-white">
                {ticket.title}
              </h1>
              <TicketStatusDot status={status} />
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              #{ticket.id.slice(0, 8)} · opened {formatDateTime(ticket.created_at)}
              {ticket.reference_id ? ` · ${ticket.reference_id}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="koda-btn-pill h-8 px-3 text-xs disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </button>
            {status !== "CLOSED" ? (
              <button
                type="button"
                onClick={() => setCloseOpen(true)}
                className="koda-btn-pill h-8 px-3 text-xs text-red-600 dark:text-red-400"
              >
                <XCircle className="size-3.5" /> Close
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="resend-glass-panel overflow-hidden rounded-2xl">
        <div className="max-h-[460px] space-y-3.5 overflow-y-auto p-5">
          {loading && messages.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="size-4 animate-spin" /> Loading the conversation...
            </p>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.is_admin ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                  message.is_admin
                    ? "bg-zinc-100 text-zinc-900 ring-1 ring-black/[0.06] dark:bg-[#111115] dark:text-zinc-100 dark:ring-white/[0.07]"
                    : "bg-zinc-900 text-white ring-1 ring-black/10 dark:bg-white/[0.11] dark:text-white dark:ring-white/[0.14]",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[10.5px]">
                  <span
                    className={
                      message.is_admin
                        ? "text-brand-ink"
                        : "text-zinc-300"
                    }
                  >
                    {message.is_admin ? "KodaHosting support" : "You"}
                  </span>
                  <span className={message.is_admin ? "text-zinc-500" : "text-zinc-400"}>
                    {formatDateTime(message.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-6">{message.message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.015]">
          {status === "CLOSED" ? (
            <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="size-4" /> This ticket is closed.
            </p>
          ) : (
            <div className="flex items-end gap-2.5">
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Write a reply..."
                className="min-h-10 resize-none rounded-xl border-zinc-200 bg-white text-sm text-zinc-950 placeholder:text-zinc-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={busy || !reply.trim()}
                className="koda-btn-black h-10 shrink-0 px-4 text-xs disabled:opacity-45"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send
              </button>
            </div>
          )}
          {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
      </div>

      <AlertDialog open={closeOpen} onOpenChange={(open) => (busy ? null : setCloseOpen(open))}>
        <AlertDialogContent className="rounded-2xl border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-[#0b0b0e]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Close this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Support can still read it, but you will not be able to reply anymore. Open a new ticket if you need more help.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="rounded-full">
              Keep it open
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="rounded-full"
              onClick={(event) => {
                event.preventDefault();
                void closeTicket();
              }}
            >
              Close ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function DeveloperSupport({ extensions }: { extensions: DevExtension[] }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api<{ items?: Ticket[] }>("/v1/me/developer/tickets");
      setTickets(data.items || []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (selected) {
    return (
      <TicketDetail
        ticket={selected}
        onBack={() => {
          setSelected(null);
          void load();
        }}
        onChanged={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-zinc-950 dark:text-white">
            Developer support
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Open a ticket directly from the browser. Replies arrive right here and in the app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="koda-btn-pill h-9 px-3.5 text-xs disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          <button type="button" onClick={() => setNewOpen(true)} className="koda-btn-black h-9 px-4 text-xs">
            <Plus className="size-3.5" /> New ticket
          </button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="resend-glass-panel flex items-center justify-center gap-2 rounded-2xl p-12 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading your tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="resend-glass-panel rounded-2xl p-12 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-white/[0.05] dark:text-zinc-400">
            <LifeBuoy className="size-5" />
          </div>
          <p className="font-display text-sm font-medium text-zinc-950 dark:text-white">
            No tickets yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Review decisions, a broken release, API questions, or listing issues: open a ticket and the reply appears in this console.
          </p>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="koda-btn-black mt-5 h-9 px-4 text-xs"
          >
            <Plus className="size-3.5" /> Open your first ticket
          </button>
        </div>
      ) : (
        <div className="resend-glass-panel overflow-hidden rounded-2xl">
          <ul className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setSelected(ticket)}
                  className="group flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-200/80 group-hover:text-zinc-900 dark:bg-white/[0.05] dark:text-zinc-400 dark:group-hover:bg-white/[0.08] dark:group-hover:text-white">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate font-display text-sm font-medium text-zinc-950 dark:text-white">
                        {ticket.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        {ticket.last_message_admin ? (
                          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                            Support answered
                          </span>
                        ) : ticket.awaiting_support ? (
                          <span className="font-mono text-[11px] text-zinc-500">
                            Waiting for support
                          </span>
                        ) : null}
                        <TicketStatusDot status={ticket.status} />
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {ticket.last_message || "No message yet."}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-zinc-500">
                      {ticket.reference_id ? `${ticket.reference_id} · ` : ""}
                      {formatDateTime(ticket.last_message_at || ticket.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <NewTicketDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        extensions={extensions}
        onCreated={(ticket) => {
          setSelected(ticket);
          void load();
        }}
      />
    </div>
  );
}
