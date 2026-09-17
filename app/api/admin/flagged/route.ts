import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getAdminFlaggedTransactions } from "@/lib/services/ledger-service";

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

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "pending") as "pending" | "resolved" | "all";
    const sortBy = url.searchParams.get("sortBy") || "riskScore";
    const order = url.searchParams.get("order") === "asc" ? 1 : -1;

    const transactions = await getAdminFlaggedTransactions(status, sortBy, order);

    return NextResponse.json({
      count: transactions.length,
      transactions,
    });
  } catch (error: any) {
    console.error("Admin flagged fetch error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve flagged transactions" },
      { status: 500 }
    );
  }
}
