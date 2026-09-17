import { RuleContext, RuleResult } from "./types";

/**
 * ODD HOURS / NOCTURNAL ACTIVITY RULE
 * Flags transactions conducted during high-risk nocturnal hours:
 * Evaluates whether transaction takes place between 12:00 AM (00:00) and 05:00 AM (04:59).
 * Typical automated credential stuffing, unauthorized nocturnal drains, or fraudulent card testing.
 */
export function evaluateOddHoursRule(context: RuleContext): RuleResult {
  const { transaction, currentTime } = context;
  const txDate = transaction.timestamp
    ? new Date(transaction.timestamp)
    : currentTime
    ? new Date(currentTime)
    : new Date();

  // In real deployments, user's timezone would be resolved; here we evaluate local server/simulated time
  const hour = txDate.getHours();
  const isOddHours = hour >= 0 && hour < 5; // 00:00 to 04:59

  if (isOddHours) {
    // If it's odd hours AND it's a debit or significant amount
    const isElevatedRisk = transaction.type === "debit" && transaction.amount >= 15000;
    const score = isElevatedRisk ? 50 : 35;

    const formattedTime = txDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return {
      ruleName: "Odd Hours Rule",
      triggered: true,
      score,
      reason: `Nocturnal execution pattern: transaction initiated at ${formattedTime} (between 12:00 AM and 5:00 AM window)`,
      metadata: {
        timestamp: txDate.toISOString(),
        hour,
        isOddHours: true,
      },
    };
  }

  return {
    ruleName: "Odd Hours Rule",
    triggered: false,
    score: 0,
    reason: null,
  };
}
