import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import authOptions from "@/lib/auth";
import {
  getTransactions,
  processTransaction,
} from "@/lib/services/ledger-service";
import {
  TransactionCategory,
  TransactionType,
} from "@/models/Transaction";

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
  simulatedTimestamp: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get("category") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

    const result = await getTransactions(session.user.id, {
      category,
      type,
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
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

    const result = await processTransaction({
      userId: session.user.id,
      type: type as TransactionType,
      amount,
      category: category as TransactionCategory,
      description,
      recipient,
      simulatedTimestamp,
    });

    return NextResponse.json(
      {
        message: result.message,
        isFlagged: result.isFlagged,
        riskScore: result.riskScore,
        flagReasons: result.flagReasons,
        rulesBreakdown: result.rulesBreakdown,
        transaction: result.transaction,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Transactions POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error processing transaction" },
      { status: error.message?.includes("Insufficient funds") ? 400 : 500 }
    );
  }
}
