import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ChevronRight, Loader2, MessageSquare, Paperclip, Send } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { safeExternalUrl } from "@/lib/security";
import type { TicketDetail, TicketStatus, TicketSummary } from "@/dashboard/types";
import { cn } from "@/lib/utils";

function ticketStatusStyle(status: TicketStatus): { dot: string; text: string } {
  switch (status) {
    case "OPEN":
      return { dot: "bg-emerald-400", text: "text-emerald-400" };
    case "CLOSE_REQUESTED":
      return { dot: "bg-amber-400", text: "text-amber-300" };
    default:
      return { dot: "bg-zinc-500", text: "text-zinc-400" };
  }
}

function TicketStatusDot({ status }: { status: TicketStatus }) {
  const style = ticketStatusStyle(status);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-medium", style.text)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

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
      setReplyError(message === "slow_down" ? "That was too fast. Wait a moment and try again." : `Could not send: ${message}`);
    } finally {
      setReplyBusy(false);
    }
  }

  const closed = detail ? detail.status === "RESOLVED" || detail.status === "CLOSED" : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-[-0.03em] text-white">
            Support Tickets
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Support conversations with the developer. Personal and mental-support chats stay private inside the app.
          </p>
        </div>
        {!loading && !error && items.length > 0 ? (
          <span className="pb-1 font-mono text-xs tabular-nums text-zinc-500">
            {items.length} {items.length === 1 ? "ticket" : "tickets"}
          </span>
        ) : null}
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
        <div className="resend-glass-panel flex items-center justify-center gap-2 rounded-2xl p-12 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading your tickets...
        </div>
      ) : items.length === 0 ? (
        <div className="resend-glass-panel rounded-2xl p-12 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
            <MessageSquare className="size-5" />
          </div>
          <p className="font-display text-sm font-medium text-white">No tickets yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">
            Open a support ticket in the KodaHosting app and the full conversation will appear here.
          </p>
        </div>
      ) : (
        <div className="resend-glass-panel overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/[0.06]">
            {items.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => void openTicket(ticket.id)}
                  className="group flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 transition-colors group-hover:bg-white/[0.08] group-hover:text-white">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate font-display text-sm font-medium text-white">
                        {ticket.title}
                      </span>
                      <TicketStatusDot status={ticket.status} />
                    </div>
                    {ticket.last_message?.message ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                        {ticket.last_message.is_admin ? (
                          <span className="font-medium text-brand-ink">Team: </span>
                        ) : null}
                        {ticket.last_message.message}
                      </p>
                    ) : null}
                    <div className="mt-1.5 font-mono text-[11px] text-zinc-500">
                      {(ticket.ticket_type || "support").replace(/_/g, " ")} · {relativeTime(ticket.created_at)}
                    </div>
                  </div>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={selectedId !== null} onOpenChange={(open) => (open ? null : setSelectedId(null))}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/[0.08] bg-[#070709] p-0 text-white sm:max-w-xl"
        >
          <SheetHeader className="border-b border-white/[0.07] px-5 py-4">
            <div className="flex items-center gap-2.5 pr-8">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Back to the ticket list"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
              <SheetTitle className="truncate text-left font-display text-base font-medium text-white">
                {detail?.title || "Ticket"}
              </SheetTitle>
            </div>
            <SheetDescription className="pl-10">
              {detail ? <TicketStatusDot status={detail.status} /> : <span className="text-xs text-zinc-500">Loading details...</span>}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {detailLoading ? (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="size-4 animate-spin" /> Loading the conversation...
              </p>
            ) : detailError ? (
              <ErrorState
                compact
                title="Could not load this ticket"
                detail={detailError}
                onRetry={selectedId !== null ? () => void openTicket(selectedId) : undefined}
              />
            ) : detail ? (
              <div className="space-y-3.5">
                {(detail.messages || []).map((message, index) => {
                  const safeAttachmentUrl = safeExternalUrl(message.attachment_url);
                  return (
                    <div
                      key={index}
                      className={cn("flex", message.is_admin ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6",
                          message.is_admin
                            ? "bg-[#111115] text-zinc-100 ring-1 ring-white/[0.07]"
                            : "bg-white/[0.11] text-white ring-1 ring-white/[0.14]",
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[10.5px]">
                          <span className={message.is_admin ? "text-brand-ink" : "text-zinc-300"}>
                            {message.is_admin ? "KodaHosting team" : "You"}
                          </span>
                          <span className="text-zinc-500">{relativeTime(message.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[13.5px] leading-6">{message.message}</p>
                        {safeAttachmentUrl ? (
                          <a
                            href={safeAttachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-brand-ink underline underline-offset-4 hover:text-brand"
                          >
                            <Paperclip className="size-3" />
                            Attachment
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {detail && !detailLoading && !detailError ? (
            <div className="border-t border-white/[0.07] bg-black/40 px-5 py-4">
              {closed ? (
                <p className="rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-xs text-zinc-400">
                  This ticket is {detail.status.toLowerCase()}. Replies are closed.
                </p>
              ) : (
                <form onSubmit={sendReply} className="space-y-3">
                  <Textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    className="resize-none rounded-xl border-white/[0.09] bg-white/[0.04] text-sm text-white placeholder:text-zinc-500 focus-visible:border-white/25 focus-visible:ring-0"
                  />
                  {replyError ? <p className="text-xs text-red-400">{replyError}</p> : null}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={replyBusy || !reply.trim()}
                      className="koda-btn-black h-9 px-4 text-xs disabled:opacity-45"
                    >
                      {replyBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Send reply
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
