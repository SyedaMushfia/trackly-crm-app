"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, statusConfig, ALL_STATUSES } from "@/components/status-badge";
import { LeadDialog } from "@/components/lead-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { ReassignDialog } from "@/components/reassign-dialog";
import { QuickNotePopover } from "@/components/quick-note-popover";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  X,
  ExternalLink,
  ArrowLeftRight,
  Download,
  Loader2,
} from "lucide-react";
import { downloadFromEndpoint, todayStr } from "@/lib/csv";
import type { LeadWithUser, LeadStatus } from "@/types";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface User {
  id: string;
  name: string;
}

const sourceOptions = [
  "ALL", "WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER",
];

function isOverdue(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000;
}

function LeadsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "ALL");
  const [userFilter, setUserFilter] = useState(searchParams.get("user_id") ?? "ALL");
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") ?? "1", 10)));

  const [leads, setLeads] = useState<LeadWithUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadWithUser | null>(null);
  const [deleteLead, setDeleteLead] = useState<LeadWithUser | null>(null);
  const [reassignLead, setReassignLead] = useState<LeadWithUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: session } = useSession();
  const isManager = session?.user?.role === "manager";

  const updateURL = useCallback(
    (s: string, st: string, so: string, u: string, p: number) => {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (st !== "ALL") params.set("status", st);
      if (so !== "ALL") params.set("source", so);
      if (u !== "ALL") params.set("user_id", u);
      if (p > 1) params.set("page", String(p));
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [pathname, router]
  );

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      if (userFilter !== "ALL") params.set("user_id", userFilter);
      params.set("page", String(page));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setLeads(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, sourceFilter, userFilter, page]);

  async function handleExport() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (sourceFilter !== "ALL") params.set("source", sourceFilter);
    if (userFilter !== "ALL") params.set("user_id", userFilter);

    setIsExporting(true);
    try {
      await downloadFromEndpoint(`/api/leads/export?${params.toString()}`, `leads-${todayStr()}.csv`);
    } catch {
      toast.error("Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    if (!isManager) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(() => toast.error("Failed to load salespeople"));
  }, [isManager]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Inline status change — calls dedicated /status route
  async function handleInlineStatusChange(leadId: string, newStatus: LeadStatus) {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
      fetchLeads();
    }
  }

  // When filters change reset to page 1
  function handleFilterChange(
    s: string, st: string, so: string, u: string
  ) {
    setSearch(s);
    setStatusFilter(st);
    setSourceFilter(so);
    setUserFilter(u);
    setPage(1);
    updateURL(s, st, so, u, 1);
  }

  function handlePageChange(next: number) {
    setPage(next);
    updateURL(search, statusFilter, sourceFilter, userFilter, next);
  }

  const hasActiveFilters =
    search || statusFilter !== "ALL" || sourceFilter !== "ALL" || userFilter !== "ALL";

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setUserFilter("ALL");
    setPage(1);
    router.replace(pathname, { scroll: false });
  }

  return (
    <>
      <KeyboardShortcuts onNewLead={() => setCreateOpen(true)} />

      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground ml-3 -mt-4">
              {isLoading
                ? "Loading..."
                : `${pagination?.total ?? 0} lead${pagination?.total !== 1 ? "s" : ""}`}
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
              {!isManager && (
                <kbd className="ml-2 text-xs bg-card/20 px-1.5 py-0.5 rounded font-mono">N</kbd>
              )}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, company, email..."
              className="pl-9"
              value={search}
              onChange={(e) => handleFilterChange(e.target.value, statusFilter, sourceFilter, userFilter)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => handleFilterChange(search, v, sourceFilter, userFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusConfig[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(v) => handleFilterChange(search, statusFilter, v, userFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL"
                    ? "All Sources"
                    : s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isManager && (
            <Select
              value={userFilter}
              onValueChange={(v) => handleFilterChange(search, statusFilter, sourceFilter, v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Salespeople" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Salespeople</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAllFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Lead</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal Value</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {hasActiveFilters
                      ? "No leads match your filters."
                      : "No leads yet. Click Add Lead to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/30 group">
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="font-medium text-foreground hover:text-[#18cb96] hover:underline"
                          >
                            {lead.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                        {isOverdue(lead.updated_at) && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.company}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.source.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </TableCell>

                    {/* Status — read-only badge for managers, dropdown for salespeople */}
                    <TableCell>
                      {isManager ? (
                        <StatusBadge status={lead.status} />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                              <StatusBadge status={lead.status} />
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {ALL_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onSelect={() => handleInlineStatusChange(lead.id, s)}
                                className="cursor-pointer"
                              >
                                <StatusBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>

                    <TableCell className="font-medium">
                      ${Number(lead.deal_value).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.users?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.updated_at).toLocaleDateString()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex justify-end items-center gap-1">
                        {/* Quick note — available to both roles */}
                        <QuickNotePopover
                          leadId={lead.id}
                          leadName={lead.name}
                          onSuccess={fetchLeads}
                        />

                        {/* Reassign — manager only */}
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-purple-700 hover:bg-purple-50"
                            title="Reassign lead"
                            onClick={() => setReassignLead(lead)}
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Edit — both roles */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          title="Edit lead"
                          onClick={() => setEditLead(lead)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* View detail */}
                        <Link href={`/dashboard/leads/${lead.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            title="View lead details"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>

                        {/* Delete — both roles */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteLead(lead)}
                          title="Delete lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-10">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === pagination.totalPages ||
                      Math.abs(p - page) <= 2
                  )
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground flex items-center">…</span>
                    ) : (
                      <Button
                        key={item}
                        variant={item === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 px-0"
                        onClick={() => handlePageChange(item as number)}
                      >
                        {item}
                      </Button>
                    )
                  )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <LeadDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchLeads}
      />

      {editLead && (
        <LeadDialog
          open={!!editLead}
          onClose={() => setEditLead(null)}
          lead={editLead}
          onSuccess={() => {
            fetchLeads();
            setEditLead(null);
          }}
        />
      )}

      {deleteLead && (
        <DeleteDialog
          open={!!deleteLead}
          onClose={() => setDeleteLead(null)}
          leadId={deleteLead.id}
          leadName={deleteLead.name}
          onSuccess={() => {
            fetchLeads();
            setDeleteLead(null);
          }}
        />
      )}

      {reassignLead && (
        <ReassignDialog
          open={!!reassignLead}
          onClose={() => setReassignLead(null)}
          lead={reassignLead}
          onSuccess={() => {
            fetchLeads();
            setReassignLead(null);
          }}
        />
      )}
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <LeadsPageInner />
    </Suspense>
  );
}