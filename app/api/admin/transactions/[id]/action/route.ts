import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { z } from "zod";
import authOptions from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Transaction from "@/models/Transaction";
import Account from "@/models/Account";
import AuditLog from "@/models/AuditLog";

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { action, note } = parsed.data;

    await connectToDatabase();

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status !== "pending") {
      return NextResponse.json(
        {
          error: `Transaction has already been finalized with status "${transaction.status}". Transactions are immutable once finalized.`,
        },
        { status: 400 }
      );
    }

    const account = await Account.findById(transaction.accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Associated account not found" },
        { status: 404 }
      );
    }

    // Execute decision
    if (action === "approve") {
      if (transaction.type === "debit") {
        // Verify balance is still sufficient before approval
        if (account.balance < transaction.amount) {
          return NextResponse.json(
            {
              error: `Approval failed: Account balance (₹${account.balance}) is now insufficient for debit of ₹${transaction.amount}`,
            },
            { status: 400 }
          );
        }

        // Atomically update balance
        await Account.findOneAndUpdate(
          { _id: account._id, balance: { $gte: transaction.amount } },
          { $inc: { balance: -transaction.amount } }
        );
      } else {
        // Credit
        await Account.findByIdAndUpdate(account._id, {
          $inc: { balance: transaction.amount },
        });
      }

      transaction.status = "completed";
      await transaction.save();
    } else {
      // Reject: void transaction without deducting from balance
      transaction.status = "rejected";
      await transaction.save();
    }

    // Record compliance AuditLog entry
    const auditRecord = await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.user.id),
      action,
      transactionId: transaction._id,
      note: note || (action === "approve" ? "Transaction verified and approved by auditor." : "Transaction rejected due to fraud risk policy violation."),
      timestamp: new Date(),
    });

    return NextResponse.json({
      message: `Transaction successfully ${action === "approve" ? "approved and completed" : "rejected and voided"}.`,
      transaction: {
        id: transaction._id.toString(),
        status: transaction.status,
      },
      auditLog: {
        id: auditRecord._id.toString(),
        action: auditRecord.action,
        timestamp: auditRecord.timestamp,
      },
    });
  } catch (error: any) {
    console.error("Admin action error:", error);
    return NextResponse.json(
      { error: "Failed to process compliance action" },
      { status: 500 }
    );
  }
}
