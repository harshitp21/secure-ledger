import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getAccountSummary } from "@/lib/services/ledger-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getAccountSummary(session.user.id);

    if (!account) {
      return NextResponse.json(
        { error: "No account found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      account,
    });
  } catch (error: any) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve account details" },
      { status: 500 }
    );
  }
}
