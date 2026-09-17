import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import authOptions from "@/lib/auth";
import { adjudicateTransaction } from "@/lib/services/ledger-service";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators may adjudicate flagged transactions" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { action, note } = parsed.data;

    const result = await adjudicateTransaction(
      session.user.id,
      id,
      action,
      note
    );

    return NextResponse.json({
      message: `Transaction successfully ${
        action === "approve" ? "approved and completed" : "rejected and voided"
      }.`,
      transaction: result.transaction,
      auditLog: result.auditLog,
    });
  } catch (error: any) {
    console.error("Admin action error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process compliance action" },
      { status: 400 }
    );
  }
}
