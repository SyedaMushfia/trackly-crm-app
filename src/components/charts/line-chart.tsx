"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/theme-provider"; 

interface Props {
  data: { month: string; revenue: number }[];
}

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

export function RevenueLineChart({ data }: Props) {
  const { theme } = useTheme();
  const tickColor = theme === "dark" ? "#f4f8f7" : "#6b7280";
  const gridColor = theme === "dark" ? "#6b7280" : "#e5e7eb";
  const tooltipBorder = theme === "dark" ? "#374151" : "#e5e7eb";
  const tooltipBg = theme === "dark" ? "#1f2937" : "#ffffff";
  const tooltipColor = theme === "dark" ? "#f9fafb" : "#111827";

  const hasData = data.some((d) => d.revenue > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        No won deals yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="1 6" stroke={gridColor} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value ?? 0);
            return [`$${num.toLocaleString()}`, "Revenue"];
          }}
          contentStyle={{
            borderRadius: "8px",
            border: `1px solid ${tooltipBorder}`,
            fontSize: "12px",
            backgroundColor: tooltipBg,
            color: tooltipColor,
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#3b82f6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}