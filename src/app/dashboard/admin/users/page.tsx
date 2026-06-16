"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, KeyRound, UserX, UserCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Valid email required"),
  password: z.string().min(8, "Minimum 8 characters"),
});

const resetSchema = z.object({
  password: z.string().min(8, "Minimum 8 characters"),
});

type CreateForm = z.infer<typeof createSchema>;
type ResetForm = z.infer<typeof resetSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(values: CreateForm) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Salesperson account created");
      createForm.reset();
      setCreateOpen(false);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    }
  }

  async function handleToggleActive(user: UserRow) {
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(user.active ? "Account deactivated" : "Account reactivated");
      fetchUsers();
    } catch {
      toast.error("Failed to update account");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetPassword(values: ResetForm) {
    if (!resetUser) return;
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });
      if (!res.ok) throw new Error();
      toast.success("Password reset successfully");
      resetForm.reset();
      setResetUser(null);
    } catch {
      toast.error("Failed to reset password");
    }
  }

  const salespeople = users.filter((u) => u.role === "salesperson");
  const managers = users.filter((u) => u.role === "manager");

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground ml-3 -mt-3">
            {salespeople.length} salesperson{salespeople.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Salesperson
        </Button>
      </div>

      {/* Managers section */}
      {managers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Managers
          </h2>
          <div className="border rounded-lg bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Salespeople section */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Salespeople
        </h2>
        <div className="border rounded-lg bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : salespeople.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No salespeople yet. Add one above.
                  </TableCell>
                </TableRow>
              ) : (
                salespeople.map((user) => (
                  <TableRow key={user.id} className={!user.active ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.active
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {user.active ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start sm:justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            resetForm.reset();
                            setResetUser(user);
                          }}
                          title="Reset password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            user.active
                              ? "text-red-500 hover:text-red-700 hover:bg-red-50"
                              : "text-green-600 hover:text-green-800 hover:bg-green-50"
                          }
                          onClick={() => handleToggleActive(user)}
                          disabled={actionLoading === user.id}
                          title={user.active ? "Deactivate" : "Reactivate"}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.active ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Salesperson</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit(handleCreate)}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Full Name
              </label>
              <Input
                placeholder="Jane Smith"
                {...createForm.register("name")}
              />
              <FieldError message={createForm.formState.errors.name?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="jane@company.com"
                {...createForm.register("email")}
              />
              <FieldError message={createForm.formState.errors.email?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Temporary Password
              </label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                {...createForm.register("password")}
              />
              <FieldError message={createForm.formState.errors.password?.message} />
              <p className="text-xs text-muted-foreground mt-1">
                Share this with the salesperson. They should change it on first login.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createForm.formState.isSubmitting}
            >
              {createForm.formState.isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetUser} onOpenChange={() => setResetUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password — {resetUser?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={resetForm.handleSubmit(handleResetPassword)}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                New Password
              </label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                {...resetForm.register("password")}
              />
              <FieldError message={resetForm.formState.errors.password?.message} />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetForm.formState.isSubmitting}
            >
              {resetForm.formState.isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}