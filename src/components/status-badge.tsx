import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/types";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  CONTACTED: { label: "Contacted", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  QUALIFIED: { label: "Qualified", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  PROPOSAL_SENT: { label: "Proposal Sent", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  WON: { label: "Won", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  LOST: { label: "Lost", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status];
  return (
    <Badge className={config.className} variant="secondary">
      {config.label}
    </Badge>
  );
}

export { statusConfig };
export const ALL_STATUSES: LeadStatus[] = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST",
];