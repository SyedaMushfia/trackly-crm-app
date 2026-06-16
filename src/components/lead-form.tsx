"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { LeadWithUser } from "@/types";
import { CountrySelect } from "./country-select";
import { StatusBadge } from "./status-badge";

// ---------------------------------------------------------------------------
// Schemas — two variants so Zod validates what each role can actually submit
// ---------------------------------------------------------------------------

const baseFields = {
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone is required"),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"], {
    message: "Lead source is required",
  }),
  country: z.string().min(1, "Country is required"),
  deal_value: z.number({ message: "Deal value is required" }).min(0, "Must be 0 or more"),
};

// Salesperson — edits status, no assignee field
const salespersonSchema = z.object({
  ...baseFields,
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"], {
    message: "Status is required",
  }),
});

// Manager — assignee required, no status field (always NEW on create, read-only on edit)
const managerSchema = z.object({
  ...baseFields,
  user_id: z.string().min(1, "Assignee is required"),
});

export type SalespersonFormValues = z.infer<typeof salespersonSchema>;
export type ManagerFormValues = z.infer<typeof managerSchema>;
export type LeadFormValues = SalespersonFormValues | ManagerFormValues;

interface Salesperson {
  id: string;
  name: string;
}

interface LeadFormProps {
  lead?: LeadWithUser;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  isLoading: boolean;
  isManager?: boolean;
  // List of salespeople — only needed when isManager is true
  salespeople?: Salesperson[];
}

const sourceOptions = [
  { value: "WEBSITE", label: "Website" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "REFERRAL", label: "Referral" },
  { value: "COLD_EMAIL", label: "Cold Email" },
  { value: "EVENT", label: "Event" },
  { value: "OTHER", label: "Other" },
];

const statusOptions = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function LeadForm({
  lead,
  onSubmit,
  isLoading,
  isManager = false,
  salespeople = [],
}: LeadFormProps) {
  const schema = isManager ? managerSchema : salespersonSchema;

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: isManager
      ? {
          name: lead?.name ?? "",
          company: lead?.company ?? "",
          email: lead?.email ?? "",
          phone: lead?.phone ?? "",
          source: lead?.source,
          country: lead?.country ?? "",
          deal_value: lead?.deal_value,
          // Pre-fill assignee when editing
          user_id: lead?.user_id ?? "",
        }
      : {
          name: lead?.name ?? "",
          company: lead?.company ?? "",
          email: lead?.email ?? "",
          phone: lead?.phone ?? "",
          source: lead?.source,
          status: lead?.status,
          country: lead?.country ?? "",
          deal_value: lead?.deal_value,
        },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Row 1: Name + Company */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-name">Lead Name</FieldLabel>
              <Input
                {...field}
                id="lead-name"
                placeholder="John Smith"
                aria-invalid={fieldState.invalid}
                disabled={isLoading}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="company"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-company">Company</FieldLabel>
              <Input
                {...field}
                id="lead-company"
                placeholder="Acme Corp"
                aria-invalid={fieldState.invalid}
                disabled={isLoading}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      {/* Row 2: Email + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-email">Email</FieldLabel>
              <Input
                {...field}
                id="lead-email"
                type="email"
                placeholder="john@acme.com"
                aria-invalid={fieldState.invalid}
                disabled={isLoading}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-phone">Phone</FieldLabel>
              <Input
                {...field}
                id="lead-phone"
                placeholder="+1 555 000 0000"
                aria-invalid={fieldState.invalid}
                disabled={isLoading}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      {/* Row 3: Source + Status (SP) or Source + Assignee (Manager) */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="source"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-source">Lead Source</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <SelectTrigger id="lead-source" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {isManager ? (
          // Manager — assignee picker instead of status
          <Controller
            name={"user_id" as keyof LeadFormValues}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="lead-assignee">Assign To</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value as string}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="lead-assignee" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    {salespeople.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        ) : (
          // Salesperson — editable status dropdown
          <Controller
            name={"status" as keyof LeadFormValues}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="lead-status">Status</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value as string}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="lead-status" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
      </div>

      {/* Manager editing an existing lead — show current status as read-only */}
      {isManager && lead && (
        <Field>
          <FieldLabel>Status</FieldLabel>
          <div className="flex items-center h-9 px-3 rounded-md border border-input bg-muted/50 gap-2">
            <StatusBadge status={lead.status} />
            <span className="text-xs text-muted-foreground ml-auto">
              Only the assigned salesperson can change this
            </span>
          </div>
        </Field>
      )}

      {/* Row 4: Deal Value + Country */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="deal_value"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-deal-value">Deal Value ($)</FieldLabel>
              <Input
                id="lead-deal-value"
                type="number"
                min="0"
                placeholder="5000"
                aria-invalid={fieldState.invalid}
                disabled={isLoading}
                name={field.name}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                ref={field.ref}
                onChange={(event) => {
                  const rawValue = event.target.value;
                  if (rawValue === "") {
                    field.onChange(undefined);
                    return;
                  }
                  const nextValue = Number(rawValue);
                  field.onChange(Number.isNaN(nextValue) ? undefined : nextValue);
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="country"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-country">Country</FieldLabel>
              <CountrySelect
                inputId="lead-country"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isLoading}
                hasError={!!fieldState.error}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
        ) : (
          lead ? "Update Lead" : "Create Lead"
        )}
      </Button>
    </form>
  );
}