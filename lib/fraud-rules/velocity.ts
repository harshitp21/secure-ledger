import { RuleContext, RuleResult } from "./types";

/**
 * VELOCITY RULE
 * Detects rapid automated or automated burst fraud activity:
 * Flags if the user has executed 5 or more transactions within the last 10 minutes.
 */
export function evaluateVelocityRule(context: RuleContext): RuleResult {
  const { recentTransactions, currentTime = new Date() } = context;
  const WINDOW_MINUTES = 10;
  const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
  const MAX_PERMISSIBLE_TXNS = 5;

  const nowTime = new Date(currentTime).getTime();

  // Filter transactions created within the rolling window
  const windowTransactions = recentTransactions.filter((tx) => {
    const txTime = new Date(tx.timestamp).getTime();
    return nowTime - txTime >= 0 && nowTime - txTime <= WINDOW_MS;
  });

  const count = windowTransactions.length;

  if (count >= MAX_PERMISSIBLE_TXNS) {
    return {
      ruleName: "Velocity Spike Rule",
      triggered: true,
      score: 55,
      reason: `Velocity spike detected: ${count} transactions attempted within ${WINDOW_MINUTES} minutes (threshold: ${MAX_PERMISSIBLE_TXNS})`,
      metadata: {
        windowMinutes: WINDOW_MINUTES,
        transactionCount: count,
        threshold: MAX_PERMISSIBLE_TXNS,
      },
    };
  }

  // Warning score if nearing limit (4 txns)
  if (count === 4) {
    return {
      ruleName: "Velocity Spike Rule",
      triggered: false,
      score: 20,
      reason: null,
      metadata: {
        windowMinutes: WINDOW_MINUTES,
        transactionCount: count,
      },
    };
  }

  return {
    ruleName: "Velocity Spike Rule",
    triggered: false,
    score: 0,
    reason: null,
  };
}
