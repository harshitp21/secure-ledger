import { RuleContext, RuleResult } from "./types";

/**
 * HIGH AMOUNT RULE
 * Evaluates whether a transaction is unusually large:
 * 1. Transaction amount exceeds 80% of current available balance.
 * 2. Absolute transaction amount exceeds fixed threshold (₹1,00,000).
 */
export function evaluateHighAmountRule(context: RuleContext): RuleResult {
  const { transaction, currentBalance } = context;
  const FIXED_HIGH_THRESHOLD = 100000; // ₹1,00,000
  const RATIO_THRESHOLD = 0.8; // 80% of balance

  const isExceedingFixed = transaction.amount >= FIXED_HIGH_THRESHOLD;
  const isExceedingRatio =
    transaction.type === "debit" &&
    currentBalance > 0 &&
    transaction.amount >= currentBalance * RATIO_THRESHOLD;

  if (isExceedingFixed && isExceedingRatio) {
    return {
      ruleName: "High Amount Rule",
      triggered: true,
      score: 60,
      reason: `High transaction amount: ₹${transaction.amount.toLocaleString(
        "en-IN"
      )} exceeds ₹1,00,000 limit and constitutes ${Math.round(
        (transaction.amount / currentBalance) * 100
      )}% of account balance`,
      metadata: {
        amount: transaction.amount,
        balance: currentBalance,
        ratio: currentBalance > 0 ? transaction.amount / currentBalance : 1,
        threshold: FIXED_HIGH_THRESHOLD,
      },
    };
  }

  if (isExceedingFixed) {
    return {
      ruleName: "High Amount Rule",
      triggered: true,
      score: 55,
      reason: `High value transaction: ₹${transaction.amount.toLocaleString(
        "en-IN"
      )} exceeds the standard anomaly threshold of ₹1,00,000`,
      metadata: {
        amount: transaction.amount,
        threshold: FIXED_HIGH_THRESHOLD,
      },
    };
  }

  if (isExceedingRatio) {
    return {
      ruleName: "High Amount Rule",
      triggered: true,
      score: 50,
      reason: `High balance ratio: debit of ₹${transaction.amount.toLocaleString(
        "en-IN"
      )} consumes ${Math.round(
        (transaction.amount / currentBalance) * 100
      )}% (>80%) of available balance`,
      metadata: {
        amount: transaction.amount,
        balance: currentBalance,
        ratio: transaction.amount / currentBalance,
      },
    };
  }

  return {
    ruleName: "High Amount Rule",
    triggered: false,
    score: 0,
    reason: null,
  };
}
