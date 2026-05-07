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
import { ChevronDown } from "lucide-react";
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
import { QuickNotePopover } from "@/components/quick-note-popover";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import {
  Plus,
  Trash2,
  Search,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import type { LeadWithUser, User, LeadStatus } from "@/types";
import toast from "react-hot-toast";

const sourceOptions = [
  "ALL", "WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER",
];

// Marks a lead as overdue if it hasn't been updated in 7+ days
function isOverdue(updatedAt: string) {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff > 7 * 24 * 60 * 60 * 1000;
}

function LeadsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Keep filter state in sync with URL query params so filters persist across page reloads and shared links
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "ALL"
  );
  const [sourceFilter, setSourceFilter] = useState(
    searchParams.get("source") ?? "ALL"
  );
  const [userFilter, setUserFilter] = useState(
    searchParams.get("user_id") ?? "ALL"
  );

  const [leads, setLeads] = useState<LeadWithUser[]>([]);
  const [users, setUsers] = useState<Pick<User, "id" | "name">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteLead, setDeleteLead] = useState<LeadWithUser | null>(null);

  /*
   Updates the URL query parameters to reflect the current filter state,
   enabling shareable and bookmarkable filtered views.
 */
  const updateURL = useCallback(
    (s: string, st: string, so: string, u: string) => {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (st !== "ALL") params.set("status", st);
      if (so !== "ALL") params.set("source", so);
      if (u !== "ALL") params.set("user_id", u);
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  // Fetch leads from API with current filters
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      if (userFilter !== "ALL") params.set("user_id", userFilter);
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error();
      setLeads(await res.json());
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, sourceFilter, userFilter]);

  // Load leads whenever filters change
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {});
  }, []);

  // Inline status update
  async function handleInlineStatusChange(
    leadId: string,
    newStatus: LeadStatus
  ) {
    // Update UI immediately
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
      fetchLeads(); // revert
    }
  }

  // Check if any filters are active
  const hasActiveFilters =
    search || statusFilter !== "ALL" || sourceFilter !== "ALL" || userFilter !== "ALL";

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setUserFilter("ALL");
    router.replace(pathname, { scroll: false });
  }

  return (
    <>
      {/* N key shortcut to open new lead modal */}
      <KeyboardShortcuts onNewLead={() => setCreateOpen(true)} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">
              {isLoading
                ? "Loading..."
                : `${leads.length} lead${leads.length !== 1 ? "s" : ""}`}
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
            <kbd className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono">
              N
            </kbd>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search name, company, email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                updateURL(e.target.value, statusFilter, sourceFilter, userFilter);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              updateURL(search, v, sourceFilter, userFilter);
            }}
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
            onValueChange={(v) => {
              setSourceFilter(v);
              updateURL(search, statusFilter, v, userFilter);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "All Sources" : s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={userFilter}
            onValueChange={(v) => {
              setUserFilter(v);
              updateURL(search, statusFilter, sourceFilter, v);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Salespeople" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Salespeople</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500"
              onClick={clearAllFilters}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
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
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-gray-400"
                  >
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-gray-400"
                  >
                    {hasActiveFilters
                      ? "No leads match your filters."
                      : "No leads yet. Press N or click Add Lead."}
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50 group">
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="font-medium text-gray-900 hover:text-[#18cb96] hover:underline"
                          >
                            {lead.name}
                          </Link>
                          <p className="text-xs text-gray-400">{lead.email}</p>
                        </div>
                        {isOverdue(lead.updated_at) && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.company}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.source.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                    </TableCell>

                    {/* One-click inline status dropdown */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <StatusBadge status={lead.status} />
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"] as LeadStatus[]).map(
                            (s) => (
                              <DropdownMenuItem
                                key={s}
                                onSelect={() => handleInlineStatusChange(lead.id, s)}
                                className="cursor-pointer"
                              >
                                <StatusBadge status={s} />
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(lead.deal_value).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.users?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(lead.updated_at).toLocaleDateString()}
                    </TableCell>

                    {/* Actions — note popover + view link + delete */}
                    <TableCell>
                      <div className="flex justify-end items-center gap-1">
                        <QuickNotePopover
                          leadId={lead.id}
                          leadName={lead.name}
                          onSuccess={fetchLeads}
                        />
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
      </div>

      {/* Modals */}
      <LeadDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        onSuccess={fetchLeads}
      />
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
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <LeadsPageInner />
    </Suspense>
  );
}