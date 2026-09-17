import mongoose, { Schema, Document, Model } from "mongoose";

export type TransactionType = "credit" | "debit";
export type TransactionStatus = "completed" | "pending" | "rejected";
export type TransactionCategory =
  | "food"
  | "rent"
  | "shopping"
  | "transfer"
  | "entertainment"
  | "utilities"
  | "salary"
  | "investment"
  | "other";

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description: string;
  recipient?: string;
  riskScore: number;
  flagReasons: string[];
  status: TransactionStatus;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Transaction amount must be at least ₹1"],
    },
    category: {
      type: String,
      enum: [
        "food",
        "rent",
        "shopping",
        "transfer",
        "entertainment",
        "utilities",
        "salary",
        "investment",
        "other",
      ],
      required: true,
      default: "other",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    recipient: {
      type: String,
      trim: true,
      default: "",
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    flagReasons: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["completed", "pending", "rejected"],
      default: "completed",
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for transaction history and admin screening
TransactionSchema.index({ userId: 1, timestamp: -1 });
TransactionSchema.index({ status: 1, riskScore: -1 });
TransactionSchema.index({ status: 1, timestamp: -1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default Transaction;
