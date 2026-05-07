"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  CheckCircle,
  Trophy,
  XCircle,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

// Shape of dashboard statistics returned from API
interface DashboardStats {
  total: number;
  newLeads: number;
  qualified: number;
  won: number;
  lost: number;
  totalDealValue: number;
  wonDealValue: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  pillBg: string;
  pillText: string;
  iconBg: string;
  iconColor: string;
}

// Reusable dashboard stat card component
function StatCard({ title, value, icon, pillBg, pillText, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col gap-4 flex-1">
      {/* Colored pill with title */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit ${pillBg} ${pillText}`}>
        {title}
      </div>

      {/* Value + Icon row */}
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

// Dashboard page showing KPI overview of leads and revenue
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard statistics on mount
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setStats)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Leads",
      value: stats.total,
      icon: <Users className="h-5 w-5" />,
      pillBg: "bg-blue-100",
      pillText: "text-blue-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "New Leads",
      value: stats.newLeads,
      icon: <UserPlus className="h-5 w-5" />,
      pillBg: "bg-indigo-100",
      pillText: "text-indigo-700",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      title: "Qualified Leads",
      value: stats.qualified,
      icon: <CheckCircle className="h-5 w-5" />,
      pillBg: "bg-purple-100",
      pillText: "text-purple-700",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Won Leads",
      value: stats.won,
      icon: <Trophy className="h-5 w-5" />,
      pillBg: "bg-green-100",
      pillText: "text-green-700",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Lost Leads",
      value: stats.lost,
      icon: <XCircle className="h-5 w-5" />,
      pillBg: "bg-red-100",
      pillText: "text-red-700",
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      title: "Estimated Deal Value",
      value: `$${stats.totalDealValue.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      pillBg: "bg-yellow-100",
      pillText: "text-yellow-700",
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      title: "Won Deal Value",
      value: `$${stats.wonDealValue.toLocaleString()}`,
      icon: <TrendingUp className="h-5 w-5" />,
      pillBg: "bg-emerald-100",
      pillText: "text-emerald-700",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Your sales pipeline at a glance</p>
      </div>

      {/* 2-per-row grid filling the full dashboard area */}
      <div className="grid grid-cols-2 gap-4 h-full">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}