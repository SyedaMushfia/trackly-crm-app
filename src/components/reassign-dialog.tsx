"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { LeadWithUser } from "@/types";
import toast from "react-hot-toast";

interface Salesperson {
  id: string;
  name: string;
}

interface ReassignDialogProps {
  open: boolean;
  onClose: () => void;
  lead: LeadWithUser;
  onSuccess: () => void;
}

export function ReassignDialog({
  open,
  onClose,
  lead,
  onSuccess,
}: ReassignDialogProps) {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Load salespeople list whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setIsFetching(true);
    // Pre-select current assignee so user sees who owns it now
    setSelectedId(lead.user_id);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: Salesperson[]) => setSalespeople(data))
      .catch(() => toast.error("Failed to load salespeople"))
      .finally(() => setIsFetching(false));
  }, [open, lead.user_id]);

  async function handleReassign() {
    if (!selectedId || selectedId === lead.user_id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reassign lead");
      }

      toast.success("Lead reassigned successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const currentAssigneeName = lead.users?.name ?? "Unknown";
  const hasChanged = selectedId !== lead.user_id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{lead.name}</span> is
            currently assigned to{" "}
            <span className="font-medium text-foreground">{currentAssigneeName}</span>.
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Assign to</p>
            {isFetching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading salespeople...
              </div>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name}
                      {sp.id === lead.user_id && (
                        <span className="ml-1 text-xs text-muted-foreground">(current)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {hasChanged && selectedId && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
              A note will be added to this lead recording the reassignment.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={isLoading || !hasChanged || !selectedId}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reassigning...</>
            ) : (
              "Reassign Lead"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}