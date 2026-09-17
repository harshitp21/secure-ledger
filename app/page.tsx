import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Activity,
  Lock,
  ArrowRight,
  Sparkles,
  Search,
  FileCheck2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-16">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Rule-based Fraud & Anomaly Screening</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
          Intelligent Banking Ledger with{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Automated Fraud Detection
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Simulate a high-integrity financial account. Every transaction is screened
          synchronously across multi-vector fraud rules, holding suspicious
          anomalies for auditor adjudication before ledger settlement.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
          >
            <span>Open User Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/admin"
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium border border-slate-700/80 transition-all hover:border-slate-600"
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Auditor Queue</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 font-medium border border-slate-800 transition-colors"
          >
            <span>Login / Demo Accounts</span>
          </Link>
        </div>
      </div>

      {/* Demo Credentials Quick-Card */}
      <div className="w-full max-w-4xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">
              Demo Credentials & Pre-Seeded Profiles
            </span>
          </div>
          <span className="text-xs text-slate-500">Seed with: npm run seed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-400">Harshit (Admin)</span>
              <span className="text-[10px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">
                ROLE: ADMIN
              </span>
            </div>
            <p className="text-slate-300 font-mono">harshit@secureledger.com</p>
            <p className="text-slate-400 font-mono">123</p>
            <p className="text-[11px] text-slate-500 pt-1">
              Reviews & adjudicates flagged transactions with audit logging.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-400">Demo User 1</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                HIGH AMOUNT
              </span>
            </div>
            <p className="text-slate-300 font-mono">rahul@example.com</p>
            <p className="text-slate-400 font-mono">User@123</p>
            <p className="text-[11px] text-slate-500 pt-1">
              Triggers High Amount & Balance Ratio rules (&gt; ₹1,00,000).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-400">Demo User 2</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                ROUND TRIP
              </span>
            </div>
            <p className="text-slate-300 font-mono">priya@example.com</p>
            <p className="text-slate-400 font-mono">User@123</p>
            <p className="text-[11px] text-slate-500 pt-1">
              Demonstrates structuring detection (rapid debit followed by credit).
            </p>
          </div>
        </div>
      </div>

      {/* Feature Pillar Highlights */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            Synchronous Rules Engine
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Modular rules in <code className="text-xs text-blue-300">lib/fraud-rules/</code> evaluate
            velocity bursts, high percentage drains, round-trips, first-time recipients, and odd hours.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            Atomic Ledger & Immutability
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Balances update atomically to prevent concurrent race conditions.
            Transactions are strictly append-only; reversals require offsetting entries.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            Auditor Compliance Trail
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Flagged anomalies are escrowed until an auditor approves or voids them.
            Every compliance action is committed to an immutable <code className="text-xs text-purple-300">AuditLog</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
