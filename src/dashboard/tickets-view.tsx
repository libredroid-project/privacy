import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, MessageSquare, Paperclip, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { safeExternalUrl } from "@/lib/security";
import type { TicketDetail, TicketSummary } from "@/dashboard/types";
import { ticketTone } from "@/dashboard/types";
import { cn } from "@/lib/utils";

export function TicketsView() {
  const [items, setItems] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reply, setReply] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState("");

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ items?: TicketSummary[] }>("/v1/me/tickets");
      setItems(data.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, []);

  async function openTicket(id: string | number) {
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setReplyError("");
    setDetailLoading(true);
    try {
      const data = await api<{ ticket: TicketDetail }>(`/v1/me/tickets/${encodeURIComponent(String(id))}`);
      setDetail(data.ticket);
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setReplyBusy(true);
    setReplyError("");
    try {
      await api(`/v1/me/tickets/${encodeURIComponent(String(selectedId))}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      setReply("");
      const [nextDetail, nextList] = await Promise.all([
        api<{ ticket: TicketDetail }>(`/v1/me/tickets/${encodeURIComponent(String(selectedId))}`),
        api<{ items?: TicketSummary[] }>("/v1/me/tickets"),
      ]);
      setDetail(nextDetail.ticket);
      setItems(nextList.items || []);
    } catch (err) {
      const message = (err as Error).message;
      setReplyError(message === "slow_down" ? "That was too fast - wait a moment." : `Could not send: ${message}`);
    } finally {
      setReplyBusy(false);
    }
  }

  const closed = detail ? detail.status === "RESOLVED" || detail.status === "CLOSED" : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support Tickets</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Support conversations with the developer. Personal and mental-support chats stay in the app.
        </p>
      </div>

      {error ? (
        <ErrorState
          code="TICKETS UNAVAILABLE"
          title="Could not load support tickets"
          description="We could not reach the KodaHosting support API right now."
          detail={error}
          onRetry={() => void loadList()}
        />
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the tickets…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center">
          <MessageSquare className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tickets yet. Open one in the app, it appears here.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((ticket) => (
            <Card
              key={ticket.id}
              role="button"
              tabIndex={0}
              onClick={() => void openTicket(ticket.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void openTicket(ticket.id);
                }
              }}
              className="cursor-pointer gap-0 p-5 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{ticket.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {(ticket.ticket_type || "support").replace(/_/g, " ")} · {relativeTime(ticket.created_at)}
                  </div>
                </div>
                <Badge variant="outline" className={cn("shrink-0 font-normal", ticketTone(ticket.status))}>
                  {ticket.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {ticket.last_message?.message ? (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {ticket.last_message.is_admin ? "Team: " : ""}
                  {ticket.last_message.message}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Sheet open={selectedId !== null} onOpenChange={(open) => (open ? null : setSelectedId(null))}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="-ml-1"
                onClick={() => setSelectedId(null)}
                aria-label="Back to the ticket list"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <SheetTitle className="truncate text-left">{detail?.title || "Ticket"}</SheetTitle>
            </div>
            <SheetDescription className="flex items-center gap-2">
              {detail ? (
                <Badge variant="outline" className={cn("font-normal", ticketTone(detail.status))}>
                  {detail.status.replace(/_/g, " ")}
                </Badge>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-1 pb-6">
            {detailLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading the conversation…
              </p>
            ) : detailError ? (
              <ErrorState
                compact
                title="Could not load this ticket"
                detail={detailError}
                onRetry={selectedId !== null ? () => void openTicket(selectedId) : undefined}
              />
            ) : detail ? (
              <>
                <div className="space-y-3">
                  {(detail.messages || []).map((message, index) => {
                    const safeAttachmentUrl = safeExternalUrl(message.attachment_url);
                    return (
                    <div
                      key={index}
                      className={cn("flex", message.is_admin ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6",
                          message.is_admin
                            ? "bg-muted text-foreground"
                            : "bg-primary text-primary-foreground",
                        )}
                      >
                        {message.is_admin ? (
                          <div className="mb-1 text-[10px] font-medium tracking-wide uppercase opacity-70">
                            Team
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap">{message.message}</p>
                        {safeAttachmentUrl ? (
                          <a
                            href={safeAttachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs underline underline-offset-2"
                          >
                            <Paperclip className="size-3" />
                            Attachment
                          </a>
                        ) : null}
                        <div
                          className={cn(
                            "mt-1 text-[10px]",
                            message.is_admin ? "text-muted-foreground" : "text-primary-foreground/70",
                          )}
                        >
                          {relativeTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {closed ? (
                  <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    This ticket is {detail.status.toLowerCase()}. Replies are closed.
                  </p>
                ) : (
                  <form onSubmit={sendReply} className="space-y-2 border-t pt-4">
                    <Textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write a reply…"
                      rows={3}
                    />
                    {replyError ? <p className="text-xs text-destructive">{replyError}</p> : null}
                    <Button type="submit" size="sm" disabled={replyBusy || !reply.trim()}>
                      {replyBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send reply
                    </Button>
                  </form>
                )}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
