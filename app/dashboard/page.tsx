"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  RefreshCw,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import SpendingBreakdownChart from "@/components/SpendingBreakdownChart";
import TransactionTrendChart from "@/components/TransactionTrendChart";
import TransactionTable from "@/components/TransactionTable";
import TransactionModal from "@/components/TransactionModal";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    category: "all",
    type: "all",
    status: "all",
    search: "",
  });

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch account overview
  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
      }
    } catch (err) {
      console.error("Failed to fetch account info:", err);
    }
  }, []);

  // Fetch transactions with current filters and pagination
  const fetchTransactions = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      query.set("page", pagination.page.toString());
      query.set("limit", pagination.limit.toString());
      if (filters.category !== "all") query.set("category", filters.category);
      if (filters.type !== "all") query.set("type", filters.type);
      if (filters.status !== "all") query.set("status", filters.status);
      if (filters.search) query.set("search", filters.search);

      const res = await fetch(`/api/transactions?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (session?.user) {
      fetchAccount();
      fetchTransactions();
    }
  }, [session, fetchAccount, fetchTransactions]);

  const handleRefresh = () => {
    fetchAccount();
    fetchTransactions();
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (status === "loading" || (loading && !account)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading SecureLedger Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Account & Ledger Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time balance, spending metrics, and automated fraud-screened ledger.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* Flagged Transactions Alert Banner */}
      {account?.pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-300">
                Fraud Screening Hold in Effect
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                You have{" "}
                <span className="font-bold text-amber-400">
                  {account.pendingCount} transaction(s)
                </span>{" "}
                totaling{" "}
                <span className="font-bold text-white font-mono">
                  {formatCurrency(account.pendingDebitTotal)}
                </span>{" "}
                held under compliance review. Funds are safely escrowed pending auditor adjudication.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, status: "pending" }))}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-xs font-semibold shrink-0 transition-colors"
          >
            View Flagged
          </button>
        </div>
      )}

      {/* KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ledger Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Ledger Balance</span>
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(account?.balance || 0)}
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
            <span className="font-mono text-slate-400 font-medium">
              {account?.accountNumber || "SL-••••-••••"}
            </span>
            <span>•</span>
            <span className="capitalize text-blue-400 font-semibold">
              {account?.accountType || "Savings"}
            </span>
          </div>
        </div>

        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Available to Spend</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {formatCurrency(account?.availableBalance || 0)}
          </div>
          <p className="text-[11px] text-slate-500">
            {account?.pendingCount > 0
              ? `${formatCurrency(account.pendingDebitTotal)} held in pending review`
              : "Zero holds or pending reservations"}
          </p>
        </div>

        {/* Total Inflows (Credits) */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Inflows</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono tracking-tight">
            {formatCurrency(account?.totalCredited || 0)}
          </div>
          <p className="text-[11px] text-emerald-400/80 font-medium">
            Cumulative completed credits
          </p>
        </div>

        {/* Total Outflows (Debits) */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Outflows</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono tracking-tight">
            {formatCurrency(account?.totalDebited || 0)}
          </div>
          <p className="text-[11px] text-rose-400/80 font-medium">
            Cumulative completed debits
          </p>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">
              Spending Breakdown by Category
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
              Recharts Donut
            </span>
          </div>
          <SpendingBreakdownChart transactions={transactions} />
        </div>

        {/* Transaction Flow Trend */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">
              Transaction Volume Timeline
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
              Recharts Area
            </span>
          </div>
          <TransactionTrendChart transactions={transactions} />
        </div>
      </div>

      {/* Immutable Transaction History Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white">
              Immutable Transaction Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Audit-grade immutable records with fraud screening risk tags
            </p>
          </div>
        </div>

        <TransactionTable
          transactions={transactions}
          pagination={pagination}
          onPageChange={handlePageChange}
          filters={filters}
          setFilters={setFilters}
        />
      </div>

      {/* New Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          handleRefresh();
        }}
        currentBalance={account?.balance || 0}
      />
    </div>
  );
}
