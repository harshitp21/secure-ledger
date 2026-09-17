import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import { checkRateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  accountType: z.enum(["savings", "current"]).default("savings"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = checkRateLimit(`register_${ip}`, 10, 60000);

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait a minute before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, accountType } = parsed.data;

    await connectToDatabase();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Min 10 salt rounds for bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "user",
    });

    // Auto-create a linked Account document with starting balance of ₹50,000 (simulated)
    const randomSegment1 = Math.floor(1000 + Math.random() * 9000);
    const randomSegment2 = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `SL-${randomSegment1}-${randomSegment2}`;

    const account = await Account.create({
      userId: user._id,
      accountNumber,
      balance: 50000,
      accountType,
      currency: "INR",
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        account: {
          id: account._id.toString(),
          accountNumber: account.accountNumber,
          balance: account.balance,
          accountType: account.accountType,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
