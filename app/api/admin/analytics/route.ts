import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/services/ledger-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getAdminAnalytics();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load audit analytics" },
      { status: 500 }
    );
  }
}
