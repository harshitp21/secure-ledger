import { RuleContext, RuleResult } from "./types";

/**
 * NEW RECIPIENT + HIGH VALUE RULE
 * Detects unauthorized account takeovers or high-risk transfers:
 * Flags if an outbound transfer is directed towards a first-time recipient
 * AND the transfer amount equals or exceeds the high-risk threshold (₹25,000).
 */
export function evaluateNewRecipientRule(context: RuleContext): RuleResult {
  const { transaction, recentTransactions } = context;
  const NEW_RECIPIENT_THRESHOLD = 25000; // ₹25,000

  const recipient = transaction.recipient?.trim();

  // Only applicable for outbound transfers with a named recipient
  if (!recipient || transaction.type !== "debit") {
    return {
      ruleName: "New Recipient High-Value Rule",
      triggered: false,
      score: 0,
      reason: null,
    };
  }

  // Check if user has previously sent funds to this recipient
  const normalizedRecipient = recipient.toLowerCase();
  const hasTransactedBefore = recentTransactions.some(
    (tx) =>
      tx.recipient &&
      tx.recipient.trim().toLowerCase() === normalizedRecipient &&
      tx.status === "completed"
  );

  const isHighValue = transaction.amount >= NEW_RECIPIENT_THRESHOLD;

  if (!hasTransactedBefore && isHighValue) {
    return {
      ruleName: "New Recipient High-Value Rule",
      triggered: true,
      score: 55,
      reason: `First-time transfer anomaly: ₹${transaction.amount.toLocaleString(
        "en-IN"
      )} sent to unknown recipient "${recipient}" without historical trust score`,
      metadata: {
        recipient,
        amount: transaction.amount,
        threshold: NEW_RECIPIENT_THRESHOLD,
        isFirstTime: true,
      },
    };
  }

  // If first-time recipient but under threshold, assign modest risk
  if (!hasTransactedBefore && transaction.amount >= 10000) {
    return {
      ruleName: "New Recipient High-Value Rule",
      triggered: false,
      score: 20,
      reason: null,
      metadata: {
        recipient,
        amount: transaction.amount,
        isFirstTime: true,
      },
    };
  }

  return {
    ruleName: "New Recipient High-Value Rule",
    triggered: false,
    score: 0,
    reason: null,
  };
}
