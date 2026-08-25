"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export function DashboardChart({
  data,
}: {
  data: { month: string; revenue: number; expenses: number }[];
}) {
  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Revenue vs. expenses</h2>
          <p className="text-xs text-ink-500">Last 6 months</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-soft">
            <span className="h-2 w-2 rounded-full bg-emerald-accent" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-gold">
            <span className="h-2 w-2 rounded-full bg-gold" /> Expenses
          </span>
        </div>
      </div>

      <div className="h-60 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8C15A" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#E8C15A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#222a33" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#8b97a5", fontSize: 12 }}
              axisLine={{ stroke: "#222a33" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64707e", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v: number) => formatMoneyCompact(v)}
            />
            <Tooltip
              cursor={{ stroke: "#46525f", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-ink-600 bg-ink-850/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur">
                    <div className="mb-1.5 font-semibold text-white">{label}</div>
                    {payload.map((p) => (
                      <div key={String(p.name)} className="flex items-center justify-between gap-4 py-0.5">
                        <span className="capitalize" style={{ color: p.color as string }}>
                          {p.name === "revenue" ? "Revenue" : "Expenses"}
                        </span>
                        <span className="money font-semibold">
                          {formatMoney(Number(p.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#E8C15A"
              strokeWidth={2}
              fill="url(#expFill)"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#revFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
