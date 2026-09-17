import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import "@/models/User";
import "@/models/Transaction";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const url = new URL(req.url);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("adminId", "name email")
      .populate("transactionId", "amount type category description recipient status riskScore")
      .lean();

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        _id: log._id.toString(),
        action: log.action,
        note: log.note,
        timestamp: log.timestamp,
        admin: log.adminId
          ? {
              id: log.adminId._id?.toString(),
              name: log.adminId.name,
              email: log.adminId.email,
            }
          : null,
        transaction: log.transactionId
          ? {
              id: log.transactionId._id?.toString(),
              amount: log.transactionId.amount,
              type: log.transactionId.type,
              category: log.transactionId.category,
              description: log.transactionId.description,
              recipient: log.transactionId.recipient,
              status: log.transactionId.status,
              riskScore: log.transactionId.riskScore,
            }
          : null,
      })),
    });
  } catch (error: any) {
    console.error("Audit log GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve compliance audit trail" },
      { status: 500 }
    );
  }
}
