"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import { Avatar } from "@/components/avatar";

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const emailSchema = z.object({
  email: z.email("Invalid email address"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type NameForm = z.infer<typeof nameSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4 h-full">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const isManager = session?.user?.role === "manager";

  const [resetOpen, setResetOpen]     = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Avatar ──────────────────────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/settings/avatar", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      const { avatarUrl } = await res.json();
      await update({ avatarUrl });
      toast.success("Profile picture updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload image");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/settings/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await update({ avatarUrl: null });
      toast.success("Profile picture removed");
    } catch {
      toast.error("Failed to remove profile picture");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Forms ────────────────────────────────────────────────────────────────

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    values: { name: session?.user?.name ?? "" },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    values: { email: session?.user?.email ?? "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  async function handleNameSave(values: NameForm) {
    if (values.name === session?.user?.name) { toast("No changes to save"); return; }
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      await update({ name: values.name });
      toast.success("Name updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update name");
    }
  }

  async function handleEmailSave(values: EmailForm) {
    if (values.email === session?.user?.email) { toast("No changes to save"); return; }
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      await update({ email: values.email });
      toast.success("Email updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update email");
    }
  }

  async function handlePasswordChange(values: PasswordForm) {
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    }
  }

  async function handleResetDemoData() {
    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/reset-demo-data", { method: "POST" });
      if (!res.ok) throw new Error();
      const { updated } = await res.json();
      toast.success(`Refreshed timestamps for ${updated} lead${updated !== 1 ? "s" : ""}`);
      setResetOpen(false);
    } catch {
      toast.error("Failed to reset demo data");
    } finally {
      setIsResetting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">

      <p className="text-sm text-muted-foreground ml-3">Manage your account and preferences</p>

      {/* ── Profile + Password side by side ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch lg:items-start">

        {/* Profile */}
        <div className="flex-1 min-w-0">
          <SectionCard title="Profile">

            {/* Avatar row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-2 border-b">
              <Avatar src={session?.user?.avatarUrl} name={session?.user?.name} size="lg" />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : "Change Picture"}
                  </Button>
                  {session?.user?.avatarUrl && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={handleAvatarRemove}
                      disabled={avatarUploading}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG or WEBP · Max 2 MB</p>
                <input
                  ref={fileInputRef} type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* Name */}
            <form onSubmit={nameForm.handleSubmit(handleNameSave)} className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Name</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input {...nameForm.register("name")} placeholder="Your name" className="flex-1" />
                <Button type="submit" variant="outline" size="sm" disabled={nameForm.formState.isSubmitting} className="shrink-0 w-full sm:w-auto">
                  {nameForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <FieldError message={nameForm.formState.errors.name?.message} />
            </form>

            {/* Email */}
            <form onSubmit={emailForm.handleSubmit(handleEmailSave)} className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Email</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input {...emailForm.register("email")} type="email" placeholder="you@example.com" className="flex-1" />
                <Button type="submit" variant="outline" size="sm" disabled={emailForm.formState.isSubmitting} className="shrink-0 w-full sm:w-auto">
                  {emailForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <FieldError message={emailForm.formState.errors.email?.message} />
            </form>

            {/* Role */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-sm font-medium text-foreground">Role</span>
              <Badge className="bg-muted text-foreground capitalize hover:bg-muted">
                {session?.user?.role}
              </Badge>
            </div>

          </SectionCard>
        </div>

        {/* Change Password */}
        <div className="flex-1 min-w-0">
          <SectionCard title="Change Password">
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-5.25">

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
                <Input type="password" placeholder="••••••••" {...passwordForm.register("currentPassword")} />
                <FieldError message={passwordForm.formState.errors.currentPassword?.message} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                <Input type="password" placeholder="Minimum 8 characters" {...passwordForm.register("newPassword")} />
                <FieldError message={passwordForm.formState.errors.newPassword?.message} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
                <Input type="password" placeholder="••••••••" {...passwordForm.register("confirmPassword")} />
                <FieldError message={passwordForm.formState.errors.confirmPassword?.message} />
              </div>

              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  : "Change Password"}
              </Button>

            </form>
          </SectionCard>
        </div>

      </div>

      {/* ── Demo Tools (manager only) ── */}
      {isManager && (
        <SectionCard title="Demo Tools">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Refresh lead timestamps</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resets lead activity timestamps with realistic dates to prevent all leads from appearing overdue after extended inactivity.
              </p>
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 w-full sm:w-auto" onClick={() => setResetOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Demo Data
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetDemoData} disabled={isResetting}>
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}