import { RuleContext, RuleResult, FraudEvaluationResult } from "./types";
import { evaluateHighAmountRule } from "./high-amount";
import { evaluateVelocityRule } from "./velocity";
import { evaluateRoundTripRule } from "./round-trip";
import { evaluateNewRecipientRule } from "./new-recipient";
import { evaluateOddHoursRule } from "./odd-hours";

export * from "./types";
export * from "./high-amount";
export * from "./velocity";
export * from "./round-trip";
export * from "./new-recipient";
export * from "./odd-hours";

/**
 * FRAUD DETECTION RULES ENGINE
 * Executes all modular screening rules sequentially, computes compound risk scores,
 * gathers human-readable flag reasons, and decides if transaction requires auditor quarantine.
 *
 * @param context RuleContext containing current transaction, account balance, and recent history
 * @returns FraudEvaluationResult with riskScore (0-100), isFlagged, flagReasons, and breakdown
 */
export function runFraudScreening(context: RuleContext): FraudEvaluationResult {
  const ruleEvaluators = [
    evaluateHighAmountRule,
    evaluateVelocityRule,
    evaluateRoundTripRule,
    evaluateNewRecipientRule,
    evaluateOddHoursRule,
  ];

  const results: RuleResult[] = [];
  const flagReasons: string[] = [];
  let compoundScore = 0;

  for (const evaluate of ruleEvaluators) {
    try {
      const result = evaluate(context);
      results.push(result);

      if (result.triggered && result.reason) {
        flagReasons.push(result.reason);
      }

      // Compound scoring model:
      // Adds the score from triggered or elevated rules, scaled by diminishing returns
      if (result.score > 0) {
        if (compoundScore === 0) {
          compoundScore = result.score;
        } else {
          // Diminishing returns formula to keep compound risk realistic
          compoundScore = compoundScore + (result.score * (100 - compoundScore)) / 100;
        }
      }
    } catch (err) {
      console.error("Error executing rule evaluator:", err);
    }
  }

  // Round and clamp between 0 and 100
  const finalRiskScore = Math.min(100, Math.max(0, Math.round(compoundScore)));
  const isFlagged = finalRiskScore >= 50;

  return {
    riskScore: finalRiskScore,
    isFlagged,
    flagReasons,
    rules: results,
  };
}
