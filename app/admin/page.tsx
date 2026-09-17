"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  FileText,
  UserCheck,
  Search,
  Filter,
  BarChart3,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

interface FlaggedTx {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  category: string;
  description: string;
  recipient?: string;
  riskScore: number;
  flagReasons: string[];
  status: "pending" | "completed" | "rejected";
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  account?: {
    id: string;
    accountNumber: string;
    balance: number;
    accountType: string;
  };
}

interface AuditItem {
  _id: string;
  action: "approve" | "reject";
  note?: string;
  timestamp: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
  transaction?: {
    id: string;
    amount: number;
    type: string;
    category: string;
    description: string;
    status: string;
    riskScore: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [flaggedTxs, setFlaggedTxs] = useState<FlaggedTx[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [sortBy, setSortBy] = useState<"riskScore" | "timestamp" | "amount">("riskScore");

  // Action Dialog State
  const [selectedTxForAction, setSelectedTxForAction] = useState<FlaggedTx | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [actionNote, setActionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Guard: non-admins
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard?error=UnauthorizedAdminAccess");
    }
  }, [status, session, router]);

  // Load flagged transactions
  const fetchFlagged = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/flagged?status=${tab}&sortBy=${sortBy}&order=desc`
      );
      if (res.ok) {
        const data = await res.json();
        setFlaggedTxs(data.transactions);
      }
    } catch (err) {
      console.error("Failed to load flagged transactions:", err);
    }
  }, [tab, sortBy]);

  // Load analytics & audit logs
  const fetchAnalyticsAndLogs = useCallback(async () => {
    try {
      const [resAnalytics, resLogs] = await Promise.all([
        fetch("/api/admin/analytics"),
        fetch("/api/admin/audit-log?limit=25"),
      ]);

      if (resAnalytics.ok) {
        const data = await resAnalytics.json();
        setAnalytics(data);
      }
      if (resLogs.ok) {
        const logsData = await resLogs.json();
        setAuditLogs(logsData.logs);
      }
    } catch (err) {
      console.error("Failed to fetch admin intelligence:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchFlagged();
      fetchAnalyticsAndLogs();
    }
  }, [session, fetchFlagged, fetchAnalyticsAndLogs]);

  const handleRefresh = () => {
    fetchFlagged();
    fetchAnalyticsAndLogs();
  };

  const handleOpenAction = (tx: FlaggedTx, type: "approve" | "reject") => {
    setSelectedTxForAction(tx);
    setActionType(type);
    setActionNote("");
    setActionError(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedTxForAction) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/admin/transactions/${selectedTxForAction._id}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionType,
            note: actionNote.trim() || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to execute compliance decision");
        setSubmittingAction(false);
        return;
      }

      // Close and refresh
      setSelectedTxForAction(null);
      setSubmittingAction(false);
      handleRefresh();
    } catch (err) {
      setActionError("Network error while submitting action");
      setSubmittingAction(false);
    }
  };

  if (status === "loading" || (loading && !analytics)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading Auditor Intelligence Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wide">
              Auditor Compliance Portal
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Server-Enforced Role Check</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Fraud & Anomaly Screening Queue
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending In Review */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pending Review</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">
            {analytics?.pendingCount || 0}
          </div>
          <p className="text-[11px] text-slate-500">
            Awaiting auditor adjudication
          </p>
        </div>

        {/* Value in Pending Escrow */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Held in Escrow</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatCurrency(analytics?.pendingValue || 0)}
          </div>
          <p className="text-[11px] text-slate-500">
            Reserved pending fraud clearance
          </p>
        </div>

        {/* Top Triggered Vector */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Top Fraud Vector</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Filter className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-blue-300 truncate">
            {analytics?.mostCommonRule || "None"}
          </div>
          <p className="text-[11px] text-slate-500">
            Most frequent detection trigger
          </p>
        </div>

        {/* Adjudications Executed */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Audit Adjudications</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono flex items-center space-x-2">
            <span className="text-emerald-400">
              {analytics?.adjudicationStats?.approved || 0}
            </span>
            <span className="text-slate-600 text-lg">/</span>
            <span className="text-rose-400">
              {analytics?.adjudicationStats?.rejected || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Approved vs Rejected decisions
          </p>
        </div>
      </div>

      {/* Analytics Chart: Rule Distribution */}
      {analytics?.ruleFrequencies && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                Fraud Engine Vector Distribution
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Rule Trigger Frequencies</span>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.ruleFrequencies}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  tickFormatter={(val) => val.replace(" Rule", "")}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-white">
                            {payload[0].payload.name}
                          </p>
                          <p className="text-rose-400 font-mono">
                            {payload[0].value} occurrences
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.ruleFrequencies.map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? "#ef4444"
                          : index === 1
                          ? "#f59e0b"
                          : index === 2
                          ? "#8b5cf6"
                          : index === 3
                          ? "#3b82f6"
                          : "#10b981"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Flagged Transactions Queue Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Tab buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                tab === "pending"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Pending Adjudication ({analytics?.pendingCount || 0})
            </button>
            <button
              onClick={() => setTab("resolved")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                tab === "resolved"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Resolved Flagged Cases
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="riskScore">Highest Risk Score</option>
              <option value="timestamp">Most Recent</option>
              <option value="amount">Largest Amount</option>
            </select>
          </div>
        </div>

        {/* Flagged Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User & Account</th>
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4">Triggered Rules</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Auditor Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {flaggedTxs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {tab === "pending"
                        ? "🎉 No pending flagged transactions. Queue is fully cleared!"
                        : "No resolved flagged transactions on record."}
                    </td>
                  </tr>
                ) : (
                  flaggedTxs.map((tx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User & Account */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">
                          {tx.user?.name || "Anonymous User"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {tx.user?.email}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {tx.account?.accountNumber}
                        </p>
                      </td>

                      {/* Transaction details */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-200">
                          {tx.description}
                        </p>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="capitalize">{tx.category}</span>
                          {tx.recipient && (
                            <>
                              <span>•</span>
                              <span>To: {tx.recipient}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatDate(tx.timestamp)}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span
                          className={
                            tx.type === "debit" ? "text-rose-400" : "text-emerald-400"
                          }
                        >
                          {tx.type === "debit" ? "-" : "+"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
                            {tx.riskScore}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            High Risk
                          </span>
                        </div>
                      </td>

                      {/* Triggered Rules */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-1">
                          {tx.flagReasons?.map((reason, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] bg-slate-950/80 border border-slate-800 p-1.5 rounded-lg text-slate-300 leading-snug"
                            >
                              <span className="text-rose-400 font-bold">• </span>
                              {reason}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.status === "pending"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : tx.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {tx.status === "pending" ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenAction(tx, "approve")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenAction(tx, "reject")}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-colors flex items-center space-x-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            Adjudicated
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Compliance Audit Trail Section */}
      <div className="space-y-3 pt-6 border-t border-slate-800">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-base font-bold text-white">
            Compliance Audit Trail (AuditLog Collection)
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Permanent, tamper-evident log of all auditor adjudication decisions.
        </p>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Auditor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Transaction</th>
                <th className="py-3 px-4">Compliance Note</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">
                        {log.admin?.name || "System Admin"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {log.admin?.email}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.action === "approve"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {log.action === "approve" ? (
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-0.5" />
                        )}
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-slate-200">
                        {log.transaction?.description || "Transaction"}
                      </p>
                      {log.transaction?.amount && (
                        <p className="font-mono text-[10px] text-slate-400">
                          {formatCurrency(log.transaction.amount)} (
                          {log.transaction.type})
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300 text-[11px] max-w-sm">
                      {log.note || "No specific note attached."}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjudication Confirmation Dialog Modal */}
      {selectedTxForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {actionType === "approve" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <h4 className="font-semibold text-white text-sm">
                  {actionType === "approve"
                    ? "Approve & Complete Transaction"
                    : "Reject & Void Transaction"}
                </h4>
              </div>
              <button
                onClick={() => setSelectedTxForAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Target User:</span>
                <span className="font-semibold text-white">
                  {selectedTxForAction.user?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-semibold text-white">
                  {formatCurrency(selectedTxForAction.amount)} (
                  {selectedTxForAction.type})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Score:</span>
                <span className="text-rose-400 font-bold">
                  {selectedTxForAction.riskScore} / 100
                </span>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Compliance Adjudication Note (Written to AuditLog)
              </label>
              <textarea
                rows={3}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "e.g. Identity and authorization confirmed with customer via 2FA."
                    : "e.g. Violation of AML suspicious velocity policy. Voided."
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTxForAction(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingAction}
                onClick={handleExecuteAction}
                className={`w-1/2 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-colors ${
                  actionType === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                }`}
              >
                {submittingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Confirm {actionType === "approve" ? "Approval" : "Rejection"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
