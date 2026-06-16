"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Send, Loader2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import type { LeadMessageWithSender, LeadStatus } from "@/types";
import { cn } from "@/lib/utils";

interface MessageThreadProps {
  leadId: string;
  leadStatus: LeadStatus;
  isManager: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  salespersonName: string;
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MessageThread({
  leadId, leadStatus, isManager, isOverdue, daysOverdue, salespersonName,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<LeadMessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isClosed = leadStatus === "WON" || leadStatus === "LOST";

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/messages`);
      if (!res.ok) throw new Error();
      setMessages(await res.json());
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      const created = await res.json();
      setMessages((prev) => [...prev, created]);
      setContent("");
      toast.success(isManager ? "Message sent" : "Reply sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) return null;

  const hasThread = messages.length > 0;

  // Manager can message on any open lead — overdue leads still get the amber banner treatment
  const showOverdueBanner = isManager && isOverdue && !isClosed;
  const showManagerInput  = isManager && !isClosed;
  const showReplyInput    = !isManager && hasThread && !isClosed;

  // Nothing to show — salesperson with no message history, or closed lead with none
  if (!showManagerInput && !hasThread) return null;

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      showOverdueBanner ? "border-amber-200 bg-amber-50/40" : "bg-card"
    )}>
      {/* Overdue banner — manager, overdue, open lead */}
      {showOverdueBanner && (
        <div className="px-6 py-4 border-b border-amber-200/60">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              This lead is overdue ({daysOverdue}d)
            </p>
          </div>
          <p className="text-xs text-amber-700/80 mb-3">
            Assigned to {salespersonName}
          </p>
          <form onSubmit={handleSend} className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Send a message to ${salespersonName} about this lead`}
              className="resize-none bg-card"
              rows={2}
              disabled={isSending}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isSending || !content.trim()}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Send className="mr-2 h-3 w-3" />Send Message</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Thread */}
      {hasThread && (
        <div className="px-6 py-4 space-y-3">
          {!showOverdueBanner && (
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
              Messages
            </h2>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-md px-3 py-2",
                msg.type === "manager_message"
                  ? "bg-blue-50 border border-blue-100"
                  : "bg-muted/40 border border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">
                  {msg.users?.name ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(msg.created_at)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Manager message input — open lead, not already covered by the overdue banner */}
      {showManagerInput && !showOverdueBanner && (
        <div className={cn("px-6 py-4 space-y-2", hasThread && "border-t")}>
          {!hasThread && (
            <p className="text-sm font-medium text-foreground">
              Message {salespersonName}
            </p>
          )}
          <form onSubmit={handleSend} className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Send a message to ${salespersonName} about this lead`}
              className="resize-none"
              rows={2}
              disabled={isSending}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isSending || !content.trim()}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Send className="mr-2 h-3 w-3" />Send Message</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reply input — salesperson, open lead with existing thread */}
      {showReplyInput && (
        <form onSubmit={handleSend} className="px-6 pb-4 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Reply to your manager"
            className="resize-none"
            rows={2}
            disabled={isSending}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSending || !content.trim()}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Send className="mr-2 h-3 w-3" />Send Reply</>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Read-only notice on closed leads */}
      {hasThread && isClosed && (
        <div className="px-6 pb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          This thread is read-only — the lead is closed.
        </div>
      )}
    </div>
  );
}