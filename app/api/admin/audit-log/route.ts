import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getAuditLogs } from "@/lib/services/ledger-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

    const logs = await getAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Audit log GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve compliance audit trail" },
      { status: 500 }
    );
  }
}
