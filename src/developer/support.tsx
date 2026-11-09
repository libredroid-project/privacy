import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
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
import { formatDateTime } from "@/developer/types";

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

const STATUS_TONE: Record<string, string> = {
  OPEN: "tone-pending",
  IN_PROGRESS: "tone-pending",
  RESOLVED: "tone-online",
  CLOSED: "border-border bg-muted text-muted-foreground",
};

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Developer support</DialogTitle>
          <DialogDescription>
            No e-mail needed. Replies show up here, and in the KodaHosting app when this account is
            linked to a device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-title">Subject</Label>
            <Input
              id="ticket-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="For example: review rejected my theme"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-extension">Extension</Label>
            <Select value={extensionId} onValueChange={setExtensionId}>
              <SelectTrigger id="ticket-extension" className="w-full">
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
            <Label htmlFor="ticket-message">Message</Label>
            <Textarea
              id="ticket-message"
              value={message}
              rows={7}
              maxLength={4000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What happened, which version, and what did you expect?"
            />
          </div>

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
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
            Open ticket
          </Button>
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
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All tickets
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{ticket.title}</h1>
              <Badge variant="outline" className={`font-normal ${STATUS_TONE[status] || ""}`}>
                {status.replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              #{ticket.id.slice(0, 8)} · opened {formatDateTime(ticket.created_at)}
              {ticket.reference_id ? ` · ${ticket.reference_id}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            {status !== "CLOSED" ? (
              <Button size="sm" variant="outline" onClick={() => setCloseOpen(true)}>
                <XCircle className="size-4" /> Close
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="gap-0 p-0 shadow-none">
        <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
          {loading && messages.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading the conversation…
            </p>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_admin ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                  message.is_admin
                    ? "border bg-muted/40"
                    : "bg-brand text-white"
                }`}
              >
                <p className="text-[11px] font-medium opacity-70">
                  {message.is_admin ? "KodaHosting support" : "You"} ·{" "}
                  {formatDateTime(message.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-3">
          {status === "CLOSED" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4" /> This ticket is closed.
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Write an answer…"
                className="min-h-10"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <Button onClick={() => void sendReply()} disabled={busy || !reply.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send
              </Button>
            </div>
          )}
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>
      </Card>

      <AlertDialog open={closeOpen} onOpenChange={(open) => (busy ? null : setCloseOpen(open))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Support can still read it, but you cannot reply anymore. Open a new ticket if you need
              more help.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it open</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
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
          <h1 className="text-2xl font-semibold tracking-tight">Developer support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a ticket from the browser. No e-mail needed, answers arrive here and in the app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New ticket
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground shadow-none">
          <Loader2 className="size-4 animate-spin" /> Loading your tickets…
        </Card>
      ) : tickets.length === 0 ? (
        <Card className="gap-0 p-10 text-center shadow-none">
          <LifeBuoy className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No tickets yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Review decisions, a broken release, the API or the store listing: open a ticket and the
            answer shows up in this console.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> Open the first one
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0 shadow-none">
          <ul className="divide-y">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setSelected(ticket)}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/30"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <MessageSquare className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{ticket.title}</p>
                      <Badge
                        variant="outline"
                        className={`font-normal ${STATUS_TONE[ticket.status] || ""}`}
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      {ticket.last_message_admin ? (
                        <Badge variant="outline" className="font-normal tone-online">
                          Support answered
                        </Badge>
                      ) : ticket.awaiting_support ? (
                        <Badge variant="outline" className="font-normal">
                          Waiting for support
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {ticket.last_message || "No message yet."}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {ticket.reference_id ? `${ticket.reference_id} · ` : ""}
                      {formatDateTime(ticket.last_message_at || ticket.created_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
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
