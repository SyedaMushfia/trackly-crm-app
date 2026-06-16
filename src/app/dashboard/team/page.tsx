"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Users, MessageCircle, Download } from "lucide-react";
import toast from "react-hot-toast";
import type { TeamMember } from "@/app/api/team/route";
import { Button } from "@/components/ui/button";
import { rowsToCSV, downloadCSV, todayStr } from "@/lib/csv";

type SortKey = "name" | "open_leads" | "won_this_month" | "won_revenue_this_month" | "leads_closed_this_month" | "win_rate_all_time";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/70" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-muted-foreground" />
    : <ArrowDown className="h-3 w-3 ml-1 text-muted-foreground" />;
}

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("won_revenue_this_month");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error();
      setMembers(await res.json());
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const sorted = [...members].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleExport() {
    const headers = [
      "Name", "Email", "Open Leads", "Won This Month",
      "Revenue This Month", "Closed This Month", "Win Rate (All Time)",
    ];
    const rows = sorted.map((m) => [
      m.name,
      m.email,
      m.open_leads,
      m.won_this_month,
      `$${m.won_revenue_this_month.toLocaleString()}`,
      m.leads_closed_this_month,
      `${m.win_rate_all_time}%`,
    ]);
    downloadCSV(`team-performance-${todayStr()}.csv`, rowsToCSV(headers, rows));
  }

  const columns: { key: SortKey; label: string; className?: string; hideOn?: string }[] = [
    { key: "name",                    label: "Name" },
    { key: "open_leads",              label: "Open Leads",       className: "text-right", hideOn: "hidden sm:table-cell" },
    { key: "won_this_month",          label: "Won This Month",   className: "text-right", hideOn: "hidden md:table-cell" },
    { key: "won_revenue_this_month",  label: "Revenue This Month", className: "text-right" },
    { key: "leads_closed_this_month", label: "Closed This Month", className: "text-right", hideOn: "hidden md:table-cell" },
    { key: "win_rate_all_time",       label: "Win Rate",         className: "text-right", hideOn: "hidden sm:table-cell" },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground ml-1 sm:ml-3">
          {isLoading ? "Loading..." : `${members.length} salesperson${members.length !== 1 ? "s" : ""}`}
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || members.length === 0}>
          <Download className="mr-0 sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      {/* Table — scrollable on mobile */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              {/* Expand toggle column */}
              <TableHead className="w-8 sm:w-10" />
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.className ?? ""} ${col.hideOn ?? ""}`}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Loading team data...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/70" />
                  No salespeople found.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((member) => (
                <>
                  {/* Main row */}
                  <TableRow
                    key={member.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => toggleExpand(member.id)}
                  >
                    <TableCell className="w-8 sm:w-10">
                      {expandedId === member.id
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </TableCell>

                    {/* Name — always visible */}
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground font-normal truncate">{member.email}</p>
                          {/* Show revenue inline on mobile where some cols are hidden */}
                          <p className="text-xs text-muted-foreground font-normal sm:hidden">
                            ${member.won_revenue_this_month.toLocaleString()} · <WinRatePill rate={member.win_rate_all_time} inline />
                          </p>
                        </div>
                        {member.unreadReplies && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/leads/${member.unreadReplies!.leadId}`);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 hover:bg-[#18cb96]/20 px-2 py-0.5 rounded-full transition-colors flex-shrink-0"
                            title={`${member.unreadReplies.count} unread repl${member.unreadReplies.count !== 1 ? "ies" : "y"} — click to view most recent`}
                          >
                            <MessageCircle className="h-3 w-3" />
                            {member.unreadReplies.count}
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {member.open_leads}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">
                      {member.won_this_month}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      ${member.won_revenue_this_month.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">
                      {member.leads_closed_this_month}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <WinRatePill rate={member.win_rate_all_time} />
                    </TableCell>
                  </TableRow>

                  {/* Expanded leads sub-table */}
                  {expandedId === member.id && (
                    <TableRow key={`${member.id}-expanded`} className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={7} className="p-0">
                        <ExpandedLeads member={member} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Win rate pill ──────────────────────────────────────────────────────────────

function WinRatePill({ rate, inline = false }: { rate: number; inline?: boolean }) {
  const color =
    rate >= 60 ? "bg-emerald-100 text-emerald-700"
    : rate >= 35 ? "bg-yellow-100 text-yellow-700"
    : "bg-muted text-muted-foreground";

  if (inline) {
    return (
      <span className={`inline-block px-1.5 py-0 rounded text-xs font-medium tabular-nums ${color}`}>
        {rate}%
      </span>
    );
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ${color}`}>
      {rate}%
    </span>
  );
}

// ── Expanded leads mini-table ─────────────────────────────────────────────────

function ExpandedLeads({ member }: { member: TeamMember }) {
  if (member.leads.length === 0) {
    return (
      <div className="px-6 py-6 text-sm text-muted-foreground">
        No leads assigned to {member.name}.
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-3 border-t border-border overflow-x-auto">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {member.leads.length} lead{member.leads.length !== 1 ? "s" : ""}
      </p>
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left pb-2 font-medium">Lead</th>
            <th className="text-left pb-2 font-medium hidden sm:table-cell">Company</th>
            <th className="text-left pb-2 font-medium">Status</th>
            <th className="text-right pb-2 font-medium">Deal Value</th>
            <th className="text-right pb-2 font-medium hidden sm:table-cell">Last Activity</th>
            <th className="w-6 sm:w-8" />
          </tr>
        </thead>
        <tbody>
          {member.leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-border last:border-0 hover:bg-card/60 transition-colors"
            >
              <td className="py-2 pr-3 sm:pr-4">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="font-medium text-foreground hover:text-[#18cb96] hover:underline block truncate max-w-[120px] sm:max-w-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lead.name}
                </Link>
                {/* Company shown inline on mobile */}
                <p className="text-xs text-muted-foreground sm:hidden truncate">{lead.company}</p>
              </td>
              <td className="py-2 pr-3 sm:pr-4 text-muted-foreground hidden sm:table-cell">{lead.company}</td>
              <td className="py-2 pr-3 sm:pr-4">
                <StatusBadge status={lead.status as import("@/types").LeadStatus} />
              </td>
              <td className="py-2 pr-3 sm:pr-4 text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                ${lead.deal_value.toLocaleString()}
              </td>
              <td className="py-2 pr-3 sm:pr-4 text-right text-muted-foreground tabular-nums hidden sm:table-cell whitespace-nowrap">
                {new Date(lead.last_activity).toLocaleDateString()}
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground/70 hover:text-muted-foreground transition-colors inline-block"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}