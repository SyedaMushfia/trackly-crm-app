"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { LeadWithUser, User } from "@/types";

// Ensures all required fields are properly validated before submission
const leadFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.email("Valid email required"),
  phone: z.string().min(1, "Phone is required"),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"], {
    message: "Lead source is required",
  }),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"], {
    message: "Status is required",
  }),
  deal_value: z.number({ message: "Deal value is required" }).min(0, "Must be 0 or more"),
  user_id: z.string().min(1, "Salesperson is required"),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  lead?: LeadWithUser;
  users: Pick<User, "id" | "name">[];
  onSubmit: (values: LeadFormValues) => Promise<void>;
  isLoading: boolean;
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

export function LeadForm({ lead, users, onSubmit, isLoading }: LeadFormProps) {

  // React Hook Form setup with Zod validation
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: lead?.name ?? "",
      company: lead?.company ?? "",
      email: lead?.email ?? "",
      phone: lead?.phone ?? "",
      source: lead?.source,
      status: lead?.status,
      deal_value: lead?.deal_value,
      user_id: lead?.user_id ?? "",
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

      {/* Row 3: Source + Status */}
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
                <SelectTrigger
                  id="lead-source"
                  aria-invalid={fieldState.invalid}
                >
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
        <Controller
          name="status"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-status">Status</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <SelectTrigger
                  id="lead-status"
                  aria-invalid={fieldState.invalid}
                >
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
      </div>

      {/* Row 4: Deal Value + Salesperson */}
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
          name="user_id"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lead-user">Assigned Salesperson</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <SelectTrigger
                  id="lead-user"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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