"use client";

import { useState } from "react";
import {
  X,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Zap,
  Loader2,
  Send,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
}: TransactionModalProps) {
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("food");
  const [description, setDescription] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [simulatedTimestamp, setSimulatedTimestamp] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setEvaluationResult(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive amount");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: numAmount,
          category,
          description: description.trim(),
          recipient: recipient.trim() || undefined,
          simulatedTimestamp: simulatedTimestamp || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process transaction");
        setLoading(false);
        return;
      }

      setEvaluationResult(data);
      setLoading(false);
      onSuccess();
    } catch (err) {
      setError("Network error processing transaction");
      setLoading(false);
    }
  };

  // Preset quick triggers to showcase fraud rules easily during interviews & demos
  const applyPreset = (preset: {
    type: "debit" | "credit";
    amount: number;
    category: string;
    description: string;
    recipient?: string;
    oddHours?: boolean;
  }) => {
    setType(preset.type);
    setAmount(preset.amount.toString());
    setCategory(preset.category);
    setDescription(preset.description);
    setRecipient(preset.recipient || "");

    if (preset.oddHours) {
      const d = new Date();
      d.setHours(3, 15, 0, 0); // 03:15 AM
      setSimulatedTimestamp(d.toISOString());
    } else {
      setSimulatedTimestamp("");
    }
    setError(null);
    setEvaluationResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Create New Transaction
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
          {/* Preset Buttons for Instant Demo Testing */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Fraud Engine Presets:</span>
              </span>
              <span className="text-[10px] text-slate-500">Click to fill</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    type: "debit",
                    amount: 1450,
                    category: "food",
                    description: "Organic Groceries",
                    recipient: "Supermarket",
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
              >
                ✅ Normal Grocery (₹1,450)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    type: "debit",
                    amount: 120000,
                    category: "shopping",
                    description: "Luxury Jewelry Purchase",
                    recipient: "Tanishq Gems",
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
              >
                🚨 Trigger: High Amount (&gt;₹100k)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    type: "debit",
                    amount: 38000,
                    category: "transfer",
                    description: "High-value outward wire",
                    recipient: "Global Crypto Exchange LLC",
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
              >
                ⚠️ Trigger: New Recipient (&gt;₹25k)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    type: "debit",
                    amount: 28000,
                    category: "transfer",
                    description: "Nocturnal ATM Cashout",
                    recipient: "QuickCash Terminal",
                    oddHours: true,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
              >
                🌙 Trigger: Odd Hours (3 AM)
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Evaluation Result Screen */}
          {evaluationResult && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                evaluationResult.isFlagged
                  ? "bg-rose-950/30 border-rose-500/30"
                  : "bg-emerald-950/30 border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {evaluationResult.isFlagged ? (
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <span
                    className={`font-semibold text-sm ${
                      evaluationResult.isFlagged ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {evaluationResult.isFlagged
                      ? "Flagged by Fraud Engine"
                      : "Transaction Completed"}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400">Risk Score:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                      evaluationResult.riskScore >= 50
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {evaluationResult.riskScore} / 100
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {evaluationResult.message}
              </p>

              {evaluationResult.flagReasons?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide">
                    Triggered Rules Breakdown:
                  </span>
                  <ul className="space-y-1">
                    {evaluationResult.flagReasons.map((reason: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-slate-300 flex items-start space-x-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800"
                      >
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors mt-2"
              >
                Close Window
              </button>
            </div>
          )}

          {!evaluationResult && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("debit")}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    type === "debit"
                      ? "bg-rose-600/20 text-rose-300 border-rose-500/40 shadow-sm"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  Debit (Expense / Transfer)
                </button>
                <button
                  type="button"
                  onClick={() => setType("credit")}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    type === "credit"
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  Credit (Income / Deposit)
                </button>
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  {type === "debit" && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Balance: {formatCurrency(currentBalance)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="food">Food & Dining</option>
                    <option value="shopping">Shopping</option>
                    <option value="transfer">Transfer & Wire</option>
                    <option value="rent">Rent & Housing</option>
                    <option value="utilities">Bills & Utilities</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="salary">Salary & Wages</option>
                    <option value="investment">Investments</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recipient / Merchant (Optional)
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. Amazon, Landlord, CryptoNova LLC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Grocery restock at Nature's Basket"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Screening via Fraud Engine...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit & Screen Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
