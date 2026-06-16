"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm, type LeadFormValues } from "./lead-form";
import type { LeadWithUser } from "@/types";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Salesperson {
  id: string;
  name: string;
}

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: LeadWithUser;
  onSuccess: () => void;
}

export function LeadDialog({ open, onClose, lead, onSuccess }: LeadDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);

  const { data: session } = useSession();
  const isManager = session?.user?.role === "manager";

  // Fetch salespeople list when a manager opens the dialog
  useEffect(() => {
    if (!isManager || !open) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: Salesperson[]) => setSalespeople(data))
      .catch(() => toast.error("Failed to load salespeople"));
  }, [isManager, open]);

  // Handles both create and update logic
  async function handleSubmit(values: LeadFormValues) {
    setIsLoading(true);
    try {
      const url = lead ? `/api/leads/${lead.id}` : "/api/leads";
      const method = lead ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Something went wrong");
      }

      toast.success(lead ? "Lead updated!" : "Lead created!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
        </DialogHeader>
        <LeadForm
          lead={lead}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isManager={isManager}
          salespeople={salespeople}
        />
      </DialogContent>
    </Dialog>
  );
}