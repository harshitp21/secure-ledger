import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Transaction from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    // 1. Pending flagged transactions count and total value
    const pendingTransactions = await Transaction.find({ status: "pending" }).lean();
    const pendingCount = pendingTransactions.length;
    const pendingValue = pendingTransactions.reduce((acc, tx) => acc + tx.amount, 0);

    // 2. All flagged transactions count (riskScore >= 50 or status is pending/rejected)
    const allFlagged = await Transaction.find({
      $or: [{ riskScore: { $gte: 50 } }, { status: "pending" }],
    }).lean();
    const totalFlaggedCount = allFlagged.length;

    // 3. Rule breakdown frequencies from flagReasons
    const ruleFrequencies: Record<string, number> = {
      "High Amount Rule": 0,
      "Velocity Spike Rule": 0,
      "Round-Trip Structuring Rule": 0,
      "New Recipient High-Value Rule": 0,
      "Odd Hours Rule": 0,
    };

    allFlagged.forEach((tx) => {
      tx.flagReasons.forEach((reason) => {
        if (reason.includes("₹1,00,000") || reason.includes("80%")) {
          ruleFrequencies["High Amount Rule"]++;
        } else if (reason.includes("Velocity") || reason.includes("minutes")) {
          ruleFrequencies["Velocity Spike Rule"]++;
        } else if (reason.includes("round-trip") || reason.includes("structuring")) {
          ruleFrequencies["Round-Trip Structuring Rule"]++;
        } else if (reason.includes("recipient") || reason.includes("trust score")) {
          ruleFrequencies["New Recipient High-Value Rule"]++;
        } else if (reason.includes("Nocturnal") || reason.includes("12:00 AM")) {
          ruleFrequencies["Odd Hours Rule"]++;
        }
      });
    });

    // Find most common flag reason
    let mostCommonRule = "None";
    let maxCount = 0;
    for (const [rule, count] of Object.entries(ruleFrequencies)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonRule = rule;
      }
    }

    // 4. Audit actions distribution (approved vs rejected)
    const approvedCount = await AuditLog.countDocuments({ action: "approve" });
    const rejectedCount = await AuditLog.countDocuments({ action: "reject" });

    // 5. Total transactions processed overall
    const totalTransactions = await Transaction.countDocuments();

    return NextResponse.json({
      pendingCount,
      pendingValue,
      totalFlaggedCount,
      totalTransactions,
      mostCommonRule,
      ruleFrequencies: Object.entries(ruleFrequencies).map(([name, count]) => ({
        name,
        count,
      })),
      adjudicationStats: {
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error: any) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load audit analytics" },
      { status: 500 }
    );
  }
}
