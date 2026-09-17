import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUser } from "@/lib/services/ledger-service";
import { checkRateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(3, "Password must be at least 3 characters"),
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

    // Min 10 salt rounds for bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await createUser({
      name,
      email,
      passwordHash,
      accountType,
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: result.user,
        account: result.account,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during registration." },
      { status: error.message?.includes("already exists") ? 409 : 500 }
    );
  }
}
