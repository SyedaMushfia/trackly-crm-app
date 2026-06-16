"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ActivityWithUser, ActionType } from "@/types";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ─── action type config ────────────────────────────────────────────────────

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "lead_created",    label: "Lead Created" },
  { value: "lead_edited",     label: "Lead Edited" },
  { value: "lead_deleted",    label: "Lead Deleted" },
  { value: "lead_reassigned", label: "Lead Reassigned" },
  { value: "status_changed",  label: "Status Changed" },
  { value: "note_added",      label: "Note Added" },
  { value: "manager_message", label: "Manager Message" },
  { value: "manager_reply",   label: "Salesperson Reply" },
  { value: "user_created",    label: "User Created" },
  { value: "user_deactivated",label: "User Deactivated" },
  { value: "user_reactivated",label: "User Reactivated" },
  { value: "password_reset",  label: "Password Reset" },
];

// Colour-coded badge per action category
const ACTION_STYLES: Record<ActionType, string> = {
  lead_created:     "bg-green-50 text-green-700 border-green-200",
  lead_edited:      "bg-blue-50 text-blue-700 border-blue-200",
  lead_deleted:     "bg-red-50 text-red-700 border-red-200",
  lead_reassigned:  "bg-purple-50 text-purple-700 border-purple-200",
  status_changed:   "bg-amber-50 text-amber-700 border-amber-200",
  note_added:       "bg-sky-50 text-sky-700 border-sky-200",
  manager_message:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  manager_reply:    "bg-cyan-50 text-cyan-700 border-cyan-200",
  user_created:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  user_deactivated: "bg-rose-50 text-rose-700 border-rose-200",
  user_reactivated: "bg-teal-50 text-teal-700 border-teal-200",
  password_reset:   "bg-orange-50 text-orange-700 border-orange-200",
  task_completed:   "bg-green-50 text-green-700 border-green-200",
};

function ActionBadge({ type }: { type: ActionType }) {
  const cfg = ACTION_TYPES.find((a) => a.value === type);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
        ACTION_STYLES[type]
      )}
    >
      {cfg?.label ?? type}
    </span>
  );
}

// ─── pagination ────────────────────────────────────────────────────────────

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

// ─── inner page ────────────────────────────────────────────────────────────

function AuditLogPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter state — synced to URL
  const [userFilter, setUserFilter] = useState(searchParams.get("user_id") ?? "ALL");
  const [selectedActions, setSelectedActions] = useState<ActionType[]>(
    searchParams.get("action_types")
      ? (searchParams.get("action_types")!.split(",") as ActionType[])
      : []
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from && !to) return undefined;
    return {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
  });
  const [page, setPage] = useState(
    Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  );

  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch all users for the user filter dropdown (managers + salespeople)
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(() => toast.error("Failed to load users"));
  }, []);

  // Build URL query string from current filter state
  const buildParams = useCallback(
    (overrides: {
      page?: number;
      userId?: string;
      actions?: ActionType[];
      range?: DateRange | undefined;
    } = {}) => {
      const p = new URLSearchParams();
      const u = overrides.userId ?? userFilter;
      const a = overrides.actions ?? selectedActions;
      const r = "range" in overrides ? overrides.range : dateRange;
      const pg = overrides.page ?? page;

      if (u !== "ALL") p.set("user_id", u);
      if (a.length > 0) p.set("action_types", a.join(","));
      if (r?.from) p.set("from", format(r.from, "yyyy-MM-dd"));
      if (r?.to) p.set("to", format(r.to, "yyyy-MM-dd"));
      if (pg > 1) p.set("page", String(pg));
      return p;
    },
    [userFilter, selectedActions, dateRange, page]
  );

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/audit-log?${buildParams().toString()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setActivities(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setIsLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Push filter state into URL so it's bookmarkable
  function updateURL(overrides: Parameters<typeof buildParams>[0] = {}) {
    const p = buildParams(overrides);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`, {
      scroll: false,
    });
  }

  // Toggle one action type in the multi-select list
  function toggleActionType(type: ActionType) {
    const next = selectedActions.includes(type)
      ? selectedActions.filter((a) => a !== type)
      : [...selectedActions, type];
    setSelectedActions(next);
    setPage(1);
    updateURL({ actions: next, page: 1 });
  }

  function handleUserChange(value: string) {
    setUserFilter(value);
    setPage(1);
    updateURL({ userId: value, page: 1 });
  }

  function handleDateRangeChange(range: DateRange | undefined) {
    setDateRange(range);
    setPage(1);
    updateURL({ range, page: 1 });
    // Close picker only once both dates are picked
    if (range?.from && range?.to) setDatePickerOpen(false);
  }

  function handlePageChange(next: number) {
    setPage(next);
    updateURL({ page: next });
  }

  const hasActiveFilters =
    userFilter !== "ALL" ||
    selectedActions.length > 0 ||
    !!dateRange?.from;

  function clearAllFilters() {
    setUserFilter("ALL");
    setSelectedActions([]);
    setDateRange(undefined);
    setPage(1);
    router.replace(pathname, { scroll: false });
  }

  // Human-readable date range label for the button
  function dateRangeLabel() {
    if (!dateRange?.from) return "Pick date range";
    if (!dateRange.to) return format(dateRange.from, "MMM d, yyyy");
    return `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`;
  }

  function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground ml-3">
          {isLoading
            ? "Loading..."
            : `${pagination?.total ?? 0} event${pagination?.total !== 1 ? "s" : ""}${hasActiveFilters ? " (filtered)" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-start">

        {/* User filter */}
        <Select value={userFilter} onValueChange={handleUserChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action type multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-52 justify-between">
              <span className="truncate">
                {selectedActions.length === 0
                  ? "All Action Types"
                  : selectedActions.length === 1
                  ? ACTION_TYPES.find((a) => a.value === selectedActions[0])?.label
                  : `${selectedActions.length} types selected`}
              </span>
              <ChevronLeft className="ml-2 h-4 w-4 rotate-[-90deg] opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {ACTION_TYPES.map(({ value, label }) => {
                const active = selectedActions.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleActionType(value)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-foreground hover:bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                        active ? "bg-gray-800 border-gray-800" : "border-gray-300"
                      )}
                    >
                      {active && (
                        <svg viewBox="0 0 10 10" className="h-2 w-2 text-white fill-current">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date range picker */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-60 justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{dateRangeLabel()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={clearAllFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-44">Timestamp</TableHead>
              <TableHead className="w-40">User</TableHead>
              <TableHead className="w-44">Action Type</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {hasActiveFilters
                    ? "No events match your filters."
                    : "No activity recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(activity.created_at)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {activity.users?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.users?.email ?? ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ActionBadge type={activity.action_type} />
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {activity.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
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

            {/* Page number buttons — show window of 5 around current page */}
            <div className="flex gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - page) <= 2
                )
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push("...");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-muted-foreground flex items-center"
                    >
                      …
                    </span>
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
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <AuditLogPageInner />
    </Suspense>
  );
}