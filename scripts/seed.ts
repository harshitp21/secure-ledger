import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local or .env
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

import User from "../models/User";
import Account from "../models/Account";
import Transaction from "../models/Transaction";
import AuditLog from "../models/AuditLog";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/secureledger";

async function runSeed() {
  console.log("---------------------------------------------");
  console.log("🌱 SecureLedger Database Seeder Starting...");
  console.log(`Connecting to: ${MONGODB_URI}`);
  console.log("---------------------------------------------");

  await mongoose.connect(MONGODB_URI);

  // Clear existing collections for a pristine demo setup
  console.log("Clearing existing collections...");
  await User.deleteMany({});
  await Account.deleteMany({});
  await Transaction.deleteMany({});
  await AuditLog.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash("User@123", 10);
  const adminPasswordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "Admin@123",
    10
  );

  // 1. Create Admin User
  const adminEmail = process.env.ADMIN_EMAIL || "admin@secureledger.com";
  const adminUser = await User.create({
    name: "Auditor Admin",
    email: adminEmail.toLowerCase(),
    passwordHash: adminPasswordHash,
    role: "admin",
  });
  console.log(`✅ Created Admin: ${adminUser.email} (Password: Admin@123)`);

  const adminAccount = await Account.create({
    userId: adminUser._id,
    accountNumber: "SL-ADMIN-0001",
    balance: 500000,
    accountType: "current",
    currency: "INR",
  });

  // 2. Create Demo User 1: Rahul Sharma (Triggers High Amount Anomaly)
  const rahul = await User.create({
    name: "Rahul Sharma",
    email: "rahul@example.com",
    passwordHash: defaultPasswordHash,
    role: "user",
  });
  const rahulAccount = await Account.create({
    userId: rahul._id,
    accountNumber: "SL-8492-1029",
    balance: 78500,
    accountType: "savings",
  });
  console.log(`✅ Created Demo User: ${rahul.email} (Password: User@123)`);

  // Rahul's normal and flagged transactions
  const now = Date.now();
  await Transaction.create([
    {
      accountId: rahulAccount._id,
      userId: rahul._id,
      type: "credit",
      amount: 85000,
      category: "salary",
      description: "Monthly Tech Corp Salary Credit",
      status: "completed",
      riskScore: 0,
      flagReasons: [],
      timestamp: new Date(now - 14 * 86400000),
    },
    {
      accountId: rahulAccount._id,
      userId: rahul._id,
      type: "debit",
      amount: 4200,
      category: "shopping",
      description: "Apparel & Electronics Purchase",
      recipient: "Amazon India",
      status: "completed",
      riskScore: 5,
      flagReasons: [],
      timestamp: new Date(now - 10 * 86400000),
    },
    {
      accountId: rahulAccount._id,
      userId: rahul._id,
      type: "debit",
      amount: 2450,
      category: "food",
      description: "Weekly Grocery Restock",
      recipient: "Nature's Basket",
      status: "completed",
      riskScore: 0,
      flagReasons: [],
      timestamp: new Date(now - 5 * 86400000),
    },
    {
      accountId: rahulAccount._id,
      userId: rahul._id,
      type: "debit",
      amount: 3200,
      category: "utilities",
      description: "Monthly Power & Water Bill",
      recipient: "State Electricity Board",
      status: "completed",
      riskScore: 0,
      flagReasons: [],
      timestamp: new Date(now - 2 * 86400000),
    },
    // High Amount Flagged Anomaly (> ₹1,00,000)
    {
      accountId: rahulAccount._id,
      userId: rahul._id,
      type: "debit",
      amount: 125000,
      category: "shopping",
      description: "High-End Luxury Watch Purchase",
      recipient: "Swiss Time Boutique",
      status: "pending",
      riskScore: 65,
      flagReasons: [
        "High value transaction: ₹1,25,000 exceeds the standard anomaly threshold of ₹1,00,000",
        "High balance ratio: debit of ₹1,25,000 consumes 159% (>80%) of available balance",
      ],
      timestamp: new Date(now - 3 * 3600000),
    },
  ]);

  // 3. Create Demo User 2: Priya Patel (Triggers Round-Trip Structuring)
  const priya = await User.create({
    name: "Priya Patel",
    email: "priya@example.com",
    passwordHash: defaultPasswordHash,
    role: "user",
  });
  const priyaAccount = await Account.create({
    userId: priya._id,
    accountNumber: "SL-6214-8841",
    balance: 92400,
    accountType: "savings",
  });
  console.log(`✅ Created Demo User: ${priya.email} (Password: User@123)`);

  const debitTx = await Transaction.create({
    accountId: priyaAccount._id,
    userId: priya._id,
    type: "debit",
    amount: 48000,
    category: "transfer",
    description: "Urgent P2P Loan Outward",
    recipient: "Apex Remittance Pvt",
    status: "completed",
    riskScore: 10,
    flagReasons: [],
    timestamp: new Date(now - 25 * 60000), // 25 mins ago
  });

  await Transaction.create([
    {
      accountId: priyaAccount._id,
      userId: priya._id,
      type: "credit",
      amount: 50000,
      category: "salary",
      description: "Consulting Retainer Fee",
      status: "completed",
      riskScore: 0,
      flagReasons: [],
      timestamp: new Date(now - 7 * 86400000),
    },
    {
      accountId: priyaAccount._id,
      userId: priya._id,
      type: "debit",
      amount: 1500,
      category: "entertainment",
      description: "Gym Annual Pass installment",
      recipient: "Cult.Fit Fitness",
      status: "completed",
      riskScore: 0,
      flagReasons: [],
      timestamp: new Date(now - 3 * 86400000),
    },
    // Round-Trip Structuring Flagged Anomaly
    {
      accountId: priyaAccount._id,
      userId: priya._id,
      type: "credit",
      amount: 47900,
      category: "transfer",
      description: "Immediate Loan Reversal Return",
      recipient: "Apex Remittance Pvt",
      status: "pending",
      riskScore: 55,
      flagReasons: [
        "Suspicious round-trip flow: incoming credit of ₹47,900 closely mirrors a ₹48,000 debit executed 18 minutes ago (potential structuring/layering)",
      ],
      timestamp: new Date(now - 7 * 60000), // 7 mins ago
    },
  ]);

  // 4. Create Demo User 3: Arjun Verma (Triggers New Recipient + Odd Hours)
  const arjun = await User.create({
    name: "Arjun Verma",
    email: "arjun@example.com",
    passwordHash: defaultPasswordHash,
    role: "user",
  });
  const arjunAccount = await Account.create({
    userId: arjun._id,
    accountNumber: "SL-4931-7712",
    balance: 64200,
    accountType: "current",
  });
  console.log(`✅ Created Demo User: ${arjun.email} (Password: User@123)`);

  const oddHoursDate = new Date();
  oddHoursDate.setHours(2, 45, 0, 0); // 02:45 AM

  await Transaction.create([
    {
      accountId: arjunAccount._id,
      userId: arjun._id,
      type: "credit",
      amount: 60000,
      category: "salary",
      description: "Salary Disbursal",
      status: "completed",
      riskScore: 0,
      flagReasons: [],
      timestamp: new Date(now - 12 * 86400000),
    },
    {
      accountId: arjunAccount._id,
      userId: arjun._id,
      type: "debit",
      amount: 22000,
      category: "rent",
      description: "Monthly Apartment Lease",
      recipient: "Skyline Residency",
      status: "completed",
      riskScore: 10,
      flagReasons: [],
      timestamp: new Date(now - 4 * 86400000),
    },
    // New Recipient + High Value + Odd Hours Anomaly
    {
      accountId: arjunAccount._id,
      userId: arjun._id,
      type: "debit",
      amount: 45000,
      category: "transfer",
      description: "Late Night Offshore Remittance",
      recipient: "CryptoNova Escrow LLC",
      status: "pending",
      riskScore: 78,
      flagReasons: [
        'First-time transfer anomaly: ₹45,000 sent to unknown recipient "CryptoNova Escrow LLC" without historical trust score',
        "Nocturnal execution pattern: transaction initiated at 02:45 AM (between 12:00 AM and 5:00 AM window)",
      ],
      timestamp: oddHoursDate,
    },
  ]);

  // 5. Create Demo User 4: Sneha Kapoor (Triggers Velocity Spike)
  const sneha = await User.create({
    name: "Sneha Kapoor",
    email: "sneha@example.com",
    passwordHash: defaultPasswordHash,
    role: "user",
  });
  const snehaAccount = await Account.create({
    userId: sneha._id,
    accountNumber: "SL-9932-4410",
    balance: 53100,
    accountType: "savings",
  });
  console.log(`✅ Created Demo User: ${sneha.email} (Password: User@123)`);

  // Rapid burst of 5 small transactions within 5 minutes, followed by a 6th flagged one
  const burstTimes = [9, 8, 6, 4, 2];
  for (let i = 0; i < burstTimes.length; i++) {
    await Transaction.create({
      accountId: snehaAccount._id,
      userId: sneha._id,
      type: "debit",
      amount: 500 + i * 150,
      category: "shopping",
      description: `Rapid Card Micro-Transaction #${i + 1}`,
      recipient: "Digital Marketplace",
      status: "completed",
      riskScore: 20,
      flagReasons: [],
      timestamp: new Date(now - burstTimes[i] * 60000),
    });
  }

  // 6th transaction flagged by Velocity Rule
  await Transaction.create({
    accountId: snehaAccount._id,
    userId: sneha._id,
    type: "debit",
    amount: 8500,
    category: "shopping",
    description: "Rapid Burst Transaction #6",
    recipient: "Digital Marketplace",
    status: "pending",
    riskScore: 60,
    flagReasons: [
      "Velocity spike detected: 5 transactions attempted within 10 minutes (threshold: 5)",
    ],
    timestamp: new Date(now - 1 * 60000),
  });

  // 6. Create Historical Resolved Transactions & Audit Logs for Admin demo
  const resolvedApprovedTx = await Transaction.create({
    accountId: rahulAccount._id,
    userId: rahul._id,
    type: "debit",
    amount: 95000,
    category: "investment",
    description: "Pre-approved Mutual Fund Allocation",
    recipient: "HDFC Mutual Fund",
    status: "completed",
    riskScore: 55,
    flagReasons: [
      "High balance ratio: debit of ₹95,000 consumes 85% (>80%) of available balance",
    ],
    timestamp: new Date(now - 2 * 86400000),
  });

  const resolvedRejectedTx = await Transaction.create({
    accountId: arjunAccount._id,
    userId: arjun._id,
    type: "debit",
    amount: 72000,
    category: "transfer",
    description: "Suspicious Unauthorized International Wire",
    recipient: "QuickCash Unknown Entity",
    status: "rejected",
    riskScore: 75,
    flagReasons: [
      'First-time transfer anomaly: ₹72,000 sent to unknown recipient "QuickCash Unknown Entity"',
      "Nocturnal execution pattern: transaction initiated at 03:15 AM",
    ],
    timestamp: new Date(now - 3 * 86400000),
  });

  await AuditLog.create([
    {
      adminId: adminUser._id,
      action: "approve",
      transactionId: resolvedApprovedTx._id,
      note: "Customer confirmed investment intent via two-factor OTP verification.",
      timestamp: new Date(now - 2 * 86400000 + 1800000),
    },
    {
      adminId: adminUser._id,
      action: "reject",
      transactionId: resolvedRejectedTx._id,
      note: "Unrecognized international beneficiary flagged by suspicious nocturnal activity. Blocked per AML policy.",
      timestamp: new Date(now - 3 * 86400000 + 2400000),
    },
  ]);

  console.log("✅ Seeded Audit Log records and resolved cases");
  console.log("---------------------------------------------");
  console.log("🎉 Database seeding completed successfully!");
  console.log("Demo credentials ready:");
  console.log("👉 Admin: admin@secureledger.com / Admin@123");
  console.log("👉 User 1 (High Amount): rahul@example.com / User@123");
  console.log("👉 User 2 (Round-Trip): priya@example.com / User@123");
  console.log("👉 User 3 (New Recipient + Odd Hours): arjun@example.com / User@123");
  console.log("👉 User 4 (Velocity Spike): sneha@example.com / User@123");
  console.log("---------------------------------------------");

  await mongoose.disconnect();
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
