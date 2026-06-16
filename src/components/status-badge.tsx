import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/types";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-[#367763]/10 text-[#367763] hover:bg-[#367763]/10" },
  CONTACTED: { label: "Contacted", className: "bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/10" },
  QUALIFIED: { label: "Qualified", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  PROPOSAL_SENT: { label: "Proposal Sent", className: "bg-[#cc7318]/10 text-[#cc7318] hover:bg-[#cc7318]/10" },
  WON: { label: "Won", className: "bg-[#18cb96]/10 text-[#18cb96] hover:bg-[#18cb96]/10" },
  LOST: { label: "Lost", className: "bg-[#cc3f18]/10 text-[#cc3f18] hover:bg-[#cc3f18]/10" },
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