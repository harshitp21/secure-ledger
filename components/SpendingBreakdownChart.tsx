"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TransactionItem {
  type: string;
  amount: number;
  category: string;
  status: string;
}

interface SpendingBreakdownProps {
  transactions: TransactionItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#3b82f6", // blue
  shopping: "#ec4899", // pink
  transfer: "#8b5cf6", // purple
  rent: "#f59e0b", // amber
  utilities: "#06b6d4", // cyan
  entertainment: "#10b981", // emerald
  salary: "#14b8a6", // teal
  investment: "#6366f1", // indigo
  other: "#64748b", // slate
};

export default function SpendingBreakdownChart({
  transactions,
}: SpendingBreakdownProps) {
  const data = useMemo(() => {
    // Only aggregate debits (expenses)
    const expenseTxns = transactions.filter((t) => t.type === "debit");
    const categoryTotals: Record<string, number> = {};

    expenseTxns.forEach((tx) => {
      categoryTotals[tx.category] =
        (categoryTotals[tx.category] || 0) + tx.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, value]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value,
        color: CATEGORY_COLORS[category] || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalSpent = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
        <p>No expense data to analyze yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Add debit transactions to see category distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-72 flex flex-col justify-between">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs text-slate-400">Total Outflows</span>
        <span className="text-sm font-semibold text-slate-200">
          {formatCurrency(totalSpent)}
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const percentage = totalSpent > 0 ? ((item.value / totalSpent) * 100).toFixed(1) : "0";
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-blue-400 font-mono">
                        {formatCurrency(item.value)}
                      </p>
                      <p className="text-[10px] text-slate-400">{percentage}% of expenses</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[11px] text-slate-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
