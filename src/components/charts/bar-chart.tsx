"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTheme } from "@/components/theme-provider"; 

interface Props {
  data: { source: string; count: number }[];
}

const COLORS = ["#1efab8", "#18cb96", "#14a87c", "#0f805e", "#0a5740", "#22c55e"];

export function LeadsBySourceChart({ data }: Props) {
  const { theme } = useTheme();
  const tickColor = theme === "dark" ? "#f4f8f7" : "#6b7280";
  const gridColor = theme === "dark" ? "#6b7280" : "#e5e7eb";
  const tooltipBorder = theme === "dark" ? "#374151" : "#e5e7eb";
  const tooltipBg = theme === "dark" ? "#1f2937" : "#ffffff";
  const tooltipColor = theme === "dark" ? "#f9fafb" : "#111827";
  const cursorFill = theme === "dark" ? "#374151" : "#f9fafb";

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        No source data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 20, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="1 6" stroke={gridColor} />
        <XAxis
          dataKey="source"
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [value ?? 0, "Leads"]}
          contentStyle={{
            borderRadius: "8px",
            border: `1px solid ${tooltipBorder}`,
            fontSize: "12px",
            backgroundColor: tooltipBg,
            color: tooltipColor,
          }}
          cursor={{ fill: cursorFill }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}