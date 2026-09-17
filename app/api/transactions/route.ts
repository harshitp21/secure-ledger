import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { z } from "zod";
import authOptions from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Account from "@/models/Account";
import Transaction, {
  TransactionCategory,
  TransactionType,
} from "@/models/Transaction";
import { runFraudScreening } from "@/lib/fraud-rules";

export const dynamic = "force-dynamic";

const createTransactionSchema = z.object({
  type: z.enum(["credit", "debit"]),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.enum([
    "food",
    "rent",
    "shopping",
    "transfer",
    "entertainment",
    "utilities",
    "salary",
    "investment",
    "other",
  ]),
  description: z.string().min(1, "Description is required").max(100),
  recipient: z.string().optional().default(""),
  // Allow optional simulated timestamp for demoing time-travel / odd-hours testing
  simulatedTimestamp: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

    const query: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(session.user.id),
    };

    if (category && category !== "all") {
      query.category = category;
    }

    if (type && type !== "all") {
      query.type = type;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        // End of that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { recipient: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        _id: t._id.toString(),
        userId: t.userId.toString(),
        accountId: t.accountId.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Transactions GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve transactions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { type, amount, category, description, recipient, simulatedTimestamp } =
      parsed.data;

    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    const account = await Account.findOne({ userId: userObjectId });

    if (!account) {
      return NextResponse.json(
        { error: "Active account not found" },
        { status: 404 }
      );
    }

    // Check balance for debit transactions
    if (type === "debit" && account.balance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient funds. Account balance is ₹${account.balance.toLocaleString(
            "en-IN"
          )}, but attempted transaction is ₹${amount.toLocaleString("en-IN")}.`,
        },
        { status: 400 }
      );
    }

    // Fetch user's recent transactions (last 50) for rules engine context
    const recentTxns = await Transaction.find({ userId: userObjectId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const txDate = simulatedTimestamp ? new Date(simulatedTimestamp) : new Date();

    // Run Fraud Detection Rules Engine
    const fraudEvaluation = runFraudScreening({
      userId: session.user.id,
      accountId: account._id.toString(),
      currentBalance: account.balance,
      transaction: {
        type: type as TransactionType,
        amount,
        category: category as TransactionCategory,
        description,
        recipient,
        timestamp: txDate,
      },
      recentTransactions: recentTxns.map((t) => ({
        _id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        category: t.category,
        recipient: t.recipient,
        status: t.status,
        timestamp: t.timestamp,
      })),
      currentTime: txDate,
    });

    const isFlagged = fraudEvaluation.isFlagged;
    const initialStatus = isFlagged ? "pending" : "completed";

    // If clean transaction: perform atomic balance update
    if (!isFlagged) {
      if (type === "debit") {
        // Atomic balance check-and-decrement
        const updatedAccount = await Account.findOneAndUpdate(
          { _id: account._id, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { new: true }
        );

        if (!updatedAccount) {
          return NextResponse.json(
            { error: "Insufficient funds or concurrent update conflict. Please try again." },
            { status: 400 }
          );
        }
      } else {
        // Atomic increment for credits
        await Account.findByIdAndUpdate(account._id, {
          $inc: { balance: amount },
        });
      }
    }

    // Create immutable transaction record
    const newTransaction = await Transaction.create({
      accountId: account._id,
      userId: userObjectId,
      type,
      amount,
      category,
      description,
      recipient: recipient || "",
      riskScore: fraudEvaluation.riskScore,
      flagReasons: fraudEvaluation.flagReasons,
      status: initialStatus,
      timestamp: txDate,
    });

    return NextResponse.json(
      {
        message: isFlagged
          ? "Transaction flagged by fraud rules engine and placed in pending auditor review."
          : "Transaction processed and ledger updated successfully.",
        isFlagged,
        riskScore: fraudEvaluation.riskScore,
        flagReasons: fraudEvaluation.flagReasons,
        rulesBreakdown: fraudEvaluation.rules,
        transaction: {
          id: newTransaction._id.toString(),
          type: newTransaction.type,
          amount: newTransaction.amount,
          category: newTransaction.category,
          description: newTransaction.description,
          recipient: newTransaction.recipient,
          status: newTransaction.status,
          riskScore: newTransaction.riskScore,
          flagReasons: newTransaction.flagReasons,
          timestamp: newTransaction.timestamp,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Transactions POST error:", error);
    return NextResponse.json(
      { error: "Internal server error processing transaction" },
      { status: 500 }
    );
  }
}
