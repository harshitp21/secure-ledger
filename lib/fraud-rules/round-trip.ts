import { RuleContext, RuleResult } from "./types";

/**
 * ROUND-TRIP / STRUCTURING RULE
 * Detects round-trip funds circulation or structuring/layering anomalies:
 * Flags if funds are debited and then a similar amount (within ±5%) is credited back
 * within a short time window (30 minutes), or vice versa.
 */
export function evaluateRoundTripRule(context: RuleContext): RuleResult {
  const { transaction, recentTransactions, currentTime = new Date() } = context;
  const WINDOW_MINUTES = 30;
  const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
  const VARIANCE_TOLERANCE = 0.05; // ±5% match

  const nowTime = new Date(currentTime).getTime();
  const currentAmount = transaction.amount;
  const oppositeType = transaction.type === "credit" ? "debit" : "credit";

  // Find any opposite transaction within the window matching within ±5%
  const matchingTx = recentTransactions.find((tx) => {
    if (tx.type !== oppositeType) return false;
    const txTime = new Date(tx.timestamp).getTime();
    if (nowTime - txTime < 0 || nowTime - txTime > WINDOW_MS) return false;

    const diff = Math.abs(tx.amount - currentAmount);
    const variance = diff / currentAmount;
    return variance <= VARIANCE_TOLERANCE;
  });

  if (matchingTx) {
    const timeDiffMinutes = Math.round(
      (nowTime - new Date(matchingTx.timestamp).getTime()) / (60 * 1000)
    );

    return {
      ruleName: "Round-Trip Structuring Rule",
      triggered: true,
      score: 55,
      reason: `Suspicious round-trip flow: incoming ${transaction.type} of ₹${currentAmount.toLocaleString(
        "en-IN"
      )} closely mirrors a ₹${matchingTx.amount.toLocaleString(
        "en-IN"
      )} ${matchingTx.type} executed ${timeDiffMinutes} minutes ago (potential structuring/layering)`,
      metadata: {
        matchedTransactionId: matchingTx._id,
        matchedAmount: matchingTx.amount,
        matchedType: matchingTx.type,
        timeDiffMinutes,
      },
    };
  }

  return {
    ruleName: "Round-Trip Structuring Rule",
    triggered: false,
    score: 0,
    reason: null,
  };
}
