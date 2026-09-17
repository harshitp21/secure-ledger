import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Transaction from "@/models/Transaction";
import "@/models/User";
import "@/models/Account";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending"; // 'pending' | 'resolved' | 'all'
    const sortBy = url.searchParams.get("sortBy") || "riskScore"; // 'riskScore' | 'timestamp' | 'amount'
    const order = url.searchParams.get("order") === "asc" ? 1 : -1;

    const query: Record<string, any> = {};

    if (status === "pending") {
      query.status = "pending";
    } else if (status === "resolved") {
      query.status = { $in: ["completed", "rejected"] };
      query.riskScore = { $gte: 50 };
    } else if (status === "all") {
      query.riskScore = { $gte: 30 }; // any elevated risk
    }

    const sortObject: Record<string, any> = {};
    if (sortBy === "riskScore") sortObject.riskScore = order;
    else if (sortBy === "amount") sortObject.amount = order;
    else sortObject.timestamp = order;

    const transactions = await Transaction.find(query)
      .sort(sortObject)
      .populate("userId", "name email role")
      .populate("accountId", "accountNumber balance accountType")
      .lean();

    return NextResponse.json({
      count: transactions.length,
      transactions: transactions.map((t: any) => ({
        _id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        recipient: t.recipient,
        riskScore: t.riskScore,
        flagReasons: t.flagReasons,
        status: t.status,
        timestamp: t.timestamp,
        user: t.userId
          ? {
              id: t.userId._id?.toString(),
              name: t.userId.name,
              email: t.userId.email,
            }
          : null,
        account: t.accountId
          ? {
              id: t.accountId._id?.toString(),
              accountNumber: t.accountId.accountNumber,
              balance: t.accountId.balance,
              accountType: t.accountId.accountType,
            }
          : null,
      })),
    });
  } catch (error: any) {
    console.error("Admin flagged fetch error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve flagged transactions" },
      { status: 500 }
    );
  }
}
