import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const account = await Account.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!account) {
      return NextResponse.json(
        { error: "No account found for this user" },
        { status: 404 }
      );
    }

    // Calculate pending / held amount from transactions flagged and awaiting review
    const pendingTransactions = await Transaction.find({
      userId: new mongoose.Types.ObjectId(session.user.id),
      status: "pending",
    });

    const pendingDebitTotal = pendingTransactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingCount = pendingTransactions.length;

    // Total completed debits and credits
    const completedTransactions = await Transaction.find({
      userId: new mongoose.Types.ObjectId(session.user.id),
      status: "completed",
    });

    const totalDebited = completedTransactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalCredited = completedTransactions
      .filter((tx) => tx.type === "credit")
      .reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      account: {
        id: account._id.toString(),
        accountNumber: account.accountNumber,
        balance: account.balance,
        availableBalance: Math.max(0, account.balance - pendingDebitTotal),
        pendingDebitTotal,
        pendingCount,
        accountType: account.accountType,
        currency: account.currency,
        totalDebited,
        totalCredited,
      },
    });
  } catch (error: any) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve account details" },
      { status: 500 }
    );
  }
}
