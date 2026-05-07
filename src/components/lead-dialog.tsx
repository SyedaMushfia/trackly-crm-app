"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm, type LeadFormValues } from "./lead-form";
import type { LeadWithUser, User } from "@/types";
import toast from "react-hot-toast";

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: LeadWithUser;
  users: Pick<User, "id" | "name">[];
  onSuccess: () => void;
}

export function LeadDialog({ open, onClose, lead, users, onSuccess }: LeadDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Handles both create and update lead logic
  async function handleSubmit(values: LeadFormValues) {
    setIsLoading(true);
    try {
      // Decide endpoint and method based on mode (create vs edit)
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
      {/* Modal container */}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header section */}
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
        </DialogHeader>

        {/* Lead form (shared between create & edit) */}
        <LeadForm
          lead={lead}
          users={users}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}