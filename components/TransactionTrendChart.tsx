"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TransactionItem {
  type: string;
  amount: number;
  status: string;
  timestamp: string | Date;
}

interface TrendChartProps {
  transactions: TransactionItem[];
}

export default function TransactionTrendChart({ transactions }: TrendChartProps) {
  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    // Sort ascending by date
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group by date (MM/dd)
    const dateMap: Record<
      string,
      { date: string; debits: number; credits: number }
    > = {};

    sorted.forEach((tx) => {
      const d = new Date(tx.timestamp);
      const dateKey = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, debits: 0, credits: 0 };
      }

      if (tx.type === "debit") {
        dateMap[dateKey].debits += tx.amount;
      } else {
        dateMap[dateKey].credits += tx.amount;
      }
    });

    return Object.values(dateMap);
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
        <p>No historical transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72 flex flex-col justify-between">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs text-slate-400">Activity Timeline</span>
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Credits</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-slate-400">Debits</span>
          </div>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="creditsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="debitsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                      <p className="font-semibold text-white">{label}</p>
                      {payload.map((entry: any, i: number) => (
                        <p
                          key={i}
                          className="font-mono flex items-center justify-between space-x-4"
                          style={{ color: entry.color }}
                        >
                          <span className="capitalize">{entry.name}:</span>
                          <span className="font-semibold">
                            {formatCurrency(entry.value)}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="credits"
              name="Credits"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#creditsGrad)"
            />
            <Area
              type="monotone"
              dataKey="debits"
              name="Debits"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#debitsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
