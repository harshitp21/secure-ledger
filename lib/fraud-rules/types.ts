import { TransactionType, TransactionCategory } from "@/models/Transaction";

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description: string;
  recipient?: string;
  timestamp?: Date;
}

export interface HistoricalTransaction {
  _id: any;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  recipient?: string;
  status: string;
  timestamp: Date;
}

export interface RuleContext {
  userId: string;
  accountId: string;
  currentBalance: number;
  transaction: TransactionInput;
  recentTransactions: HistoricalTransaction[];
  /**
   * Reference timestamp for evaluation (defaults to now, or transaction timestamp)
   */
  currentTime?: Date;
}

export interface RuleResult {
  ruleName: string;
  triggered: boolean;
  score: number;
  reason: string | null;
  metadata?: Record<string, unknown>;
}

export interface FraudEvaluationResult {
  riskScore: number;
  isFlagged: boolean;
  flagReasons: string[];
  rules: RuleResult[];
}
