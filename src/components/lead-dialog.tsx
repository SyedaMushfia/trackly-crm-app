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

      if (typeof window !== "undefined" && window.pendo) {
        if (lead) {
          // Track lead updated
          window.pendo.track("lead_updated", {
            leadId: lead.id,
            source: values.source,
            status: values.status,
            deal_value: String(values.deal_value),
            user_id: values.user_id || "",
            company: values.company,
          });

          // Track lead assignment if user_id changed
          if (values.user_id && values.user_id !== lead.user_id) {
            window.pendo.track("lead_assigned", {
              leadId: lead.id,
              assignedUserId: values.user_id,
              previousUserId: lead.user_id || "",
              isReassignment: true,
              source: values.source,
              deal_value: String(values.deal_value),
            });
          }
        } else {
          // Track lead created
          window.pendo.track("lead_created", {
            source: values.source,
            status: values.status,
            deal_value: String(values.deal_value),
            user_id: values.user_id || "",
            company: values.company,
          });

          // Track lead assignment on creation if user_id is set
          if (values.user_id) {
            window.pendo.track("lead_assigned", {
              leadId: "",
              assignedUserId: values.user_id,
              previousUserId: "",
              isReassignment: false,
              source: values.source,
              deal_value: String(values.deal_value),
            });
          }
        }
      }

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