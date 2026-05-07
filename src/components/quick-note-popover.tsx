"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, StickyNote } from "lucide-react";
import toast from "react-hot-toast";

interface QuickNotePopoverProps {
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

export function QuickNotePopover({
  leadId,
  leadName,
  onSuccess,
}: QuickNotePopoverProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(""); // Stores note input content
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added");

       // Reset form after success
      setContent("");
      setOpen(false);

      // Refresh parent data if provided
      onSuccess?.();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-gray-700"
          title="Quick add note"
        >
          <StickyNote className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Add note</p>
            <p className="text-xs text-gray-400 truncate">{leadName}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened? Next steps?"
              className="resize-none text-sm"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
                // Escape closes popover
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-400">⌘+Enter to submit</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || !content.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}