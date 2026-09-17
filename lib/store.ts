import mongoose from "mongoose";

export interface StoredUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: Date;
}

export interface StoredAccount {
  _id: string;
  userId: string;
  accountNumber: string;
  balance: number;
  accountType: "savings" | "current";
  currency: string;
  createdAt: Date;
}

export interface StoredTransaction {
  _id: string;
  accountId: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  category: string;
  description: string;
  recipient?: string;
  riskScore: number;
  flagReasons: string[];
  status: "completed" | "pending" | "rejected";
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredAuditLog {
  _id: string;
  adminId: string;
  action: "approve" | "reject";
  transactionId: string;
  note: string;
  timestamp: Date;
}

const HASH_123 = "$2a$10$dEDKRsmDZcF4wdPXcR6mWeGVUi/g1Q4yWneHSnNzNYJfP8QuKW4YG";
const HASH_USER = "$2a$10$cSOB43OHCoDUmrTpXFCqAe7jHRN8VDdebHEisC107C3bzKMPX5OPu";

const now = Date.now();

// Initial In-Memory Seed Data
const initialUsers: StoredUser[] = [
  {
    _id: "user-harshit",
    name: "Harshit",
    email: "harshit@secureledger.com",
    passwordHash: HASH_123,
    role: "admin",
    createdAt: new Date(now - 30 * 86400000),
  },
  {
    _id: "user-admin-alias",
    name: "Harshit (Admin)",
    email: "admin@secureledger.com",
    passwordHash: HASH_123,
    role: "admin",
    createdAt: new Date(now - 30 * 86400000),
  },
  {
    _id: "user-rahul",
    name: "Rahul Sharma",
    email: "rahul@example.com",
    passwordHash: HASH_USER,
    role: "user",
    createdAt: new Date(now - 20 * 86400000),
  },
  {
    _id: "user-priya",
    name: "Priya Patel",
    email: "priya@example.com",
    passwordHash: HASH_USER,
    role: "user",
    createdAt: new Date(now - 15 * 86400000),
  },
  {
    _id: "user-arjun",
    name: "Arjun Verma",
    email: "arjun@example.com",
    passwordHash: HASH_USER,
    role: "user",
    createdAt: new Date(now - 12 * 86400000),
  },
  {
    _id: "user-sneha",
    name: "Sneha Kapoor",
    email: "sneha@example.com",
    passwordHash: HASH_USER,
    role: "user",
    createdAt: new Date(now - 10 * 86400000),
  },
];

const initialAccounts: StoredAccount[] = [
  {
    _id: "acc-harshit",
    userId: "user-harshit",
    accountNumber: "SL-ADMIN-0001",
    balance: 500000,
    accountType: "current",
    currency: "INR",
    createdAt: new Date(now - 30 * 86400000),
  },
  {
    _id: "acc-admin-alias",
    userId: "user-admin-alias",
    accountNumber: "SL-ADMIN-0002",
    balance: 500000,
    accountType: "current",
    currency: "INR",
    createdAt: new Date(now - 30 * 86400000),
  },
  {
    _id: "acc-rahul",
    userId: "user-rahul",
    accountNumber: "SL-8492-1029",
    balance: 78500,
    accountType: "savings",
    currency: "INR",
    createdAt: new Date(now - 20 * 86400000),
  },
  {
    _id: "acc-priya",
    userId: "user-priya",
    accountNumber: "SL-6214-8841",
    balance: 92400,
    accountType: "savings",
    currency: "INR",
    createdAt: new Date(now - 15 * 86400000),
  },
  {
    _id: "acc-arjun",
    userId: "user-arjun",
    accountNumber: "SL-4931-7712",
    balance: 64200,
    accountType: "current",
    currency: "INR",
    createdAt: new Date(now - 12 * 86400000),
  },
  {
    _id: "acc-sneha",
    userId: "user-sneha",
    accountNumber: "SL-9932-4410",
    balance: 53100,
    accountType: "savings",
    currency: "INR",
    createdAt: new Date(now - 10 * 86400000),
  },
];

const oddHoursDate = new Date(now - 2 * 3600000);
oddHoursDate.setHours(2, 45, 0, 0);

const initialTransactions: StoredTransaction[] = [
  // Rahul normal & flagged
  {
    _id: "tx-r1",
    accountId: "acc-rahul",
    userId: "user-rahul",
    type: "credit",
    amount: 85000,
    category: "salary",
    description: "Monthly Tech Corp Salary Credit",
    riskScore: 0,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 14 * 86400000),
    createdAt: new Date(now - 14 * 86400000),
    updatedAt: new Date(now - 14 * 86400000),
  },
  {
    _id: "tx-r2",
    accountId: "acc-rahul",
    userId: "user-rahul",
    type: "debit",
    amount: 4200,
    category: "shopping",
    description: "Apparel & Electronics Purchase",
    recipient: "Amazon India",
    riskScore: 5,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 10 * 86400000),
    createdAt: new Date(now - 10 * 86400000),
    updatedAt: new Date(now - 10 * 86400000),
  },
  {
    _id: "tx-r3",
    accountId: "acc-rahul",
    userId: "user-rahul",
    type: "debit",
    amount: 2450,
    category: "food",
    description: "Weekly Grocery Restock",
    recipient: "Nature's Basket",
    riskScore: 0,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 5 * 86400000),
    createdAt: new Date(now - 5 * 86400000),
    updatedAt: new Date(now - 5 * 86400000),
  },
  {
    _id: "tx-r4",
    accountId: "acc-rahul",
    userId: "user-rahul",
    type: "debit",
    amount: 3200,
    category: "utilities",
    description: "Monthly Power & Water Bill",
    recipient: "State Electricity Board",
    riskScore: 0,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 2 * 86400000),
    createdAt: new Date(now - 2 * 86400000),
    updatedAt: new Date(now - 2 * 86400000),
  },
  // Rahul Flagged: High Amount
  {
    _id: "tx-r5-flagged",
    accountId: "acc-rahul",
    userId: "user-rahul",
    type: "debit",
    amount: 125000,
    category: "shopping",
    description: "High-End Luxury Watch Purchase",
    recipient: "Swiss Time Boutique",
    riskScore: 65,
    flagReasons: [
      "High value transaction: ₹1,25,000 exceeds the standard anomaly threshold of ₹1,00,000",
      "High balance ratio: debit of ₹1,25,000 consumes 159% (>80%) of available balance",
    ],
    status: "pending",
    timestamp: new Date(now - 3 * 3600000),
    createdAt: new Date(now - 3 * 3600000),
    updatedAt: new Date(now - 3 * 3600000),
  },

  // Priya normal & flagged (Round-trip)
  {
    _id: "tx-p1",
    accountId: "acc-priya",
    userId: "user-priya",
    type: "credit",
    amount: 50000,
    category: "salary",
    description: "Consulting Retainer Fee",
    riskScore: 0,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 7 * 86400000),
    createdAt: new Date(now - 7 * 86400000),
    updatedAt: new Date(now - 7 * 86400000),
  },
  {
    _id: "tx-p2",
    accountId: "acc-priya",
    userId: "user-priya",
    type: "debit",
    amount: 48000,
    category: "transfer",
    description: "Urgent P2P Loan Outward",
    recipient: "Apex Remittance Pvt",
    riskScore: 10,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 25 * 60000),
    createdAt: new Date(now - 25 * 60000),
    updatedAt: new Date(now - 25 * 60000),
  },
  {
    _id: "tx-p3-flagged",
    accountId: "acc-priya",
    userId: "user-priya",
    type: "credit",
    amount: 47900,
    category: "transfer",
    description: "Immediate Loan Reversal Return",
    recipient: "Apex Remittance Pvt",
    riskScore: 55,
    flagReasons: [
      "Suspicious round-trip flow: incoming credit of ₹47,900 closely mirrors a ₹48,000 debit executed 18 minutes ago (potential structuring/layering)",
    ],
    status: "pending",
    timestamp: new Date(now - 7 * 60000),
    createdAt: new Date(now - 7 * 60000),
    updatedAt: new Date(now - 7 * 60000),
  },

  // Arjun: New Recipient & Odd Hours
  {
    _id: "tx-a1",
    accountId: "acc-arjun",
    userId: "user-arjun",
    type: "credit",
    amount: 60000,
    category: "salary",
    description: "Salary Disbursal",
    riskScore: 0,
    flagReasons: [],
    status: "completed",
    timestamp: new Date(now - 12 * 86400000),
    createdAt: new Date(now - 12 * 86400000),
    updatedAt: new Date(now - 12 * 86400000),
  },
  {
    _id: "tx-a2-flagged",
    accountId: "acc-arjun",
    userId: "user-arjun",
    type: "debit",
    amount: 45000,
    category: "transfer",
    description: "Late Night Offshore Remittance",
    recipient: "CryptoNova Escrow LLC",
    riskScore: 78,
    flagReasons: [
      'First-time transfer anomaly: ₹45,000 sent to unknown recipient "CryptoNova Escrow LLC" without historical trust score',
      "Nocturnal execution pattern: transaction initiated at 02:45 AM (between 12:00 AM and 5:00 AM window)",
    ],
    status: "pending",
    timestamp: oddHoursDate,
    createdAt: oddHoursDate,
    updatedAt: oddHoursDate,
  },

  // Sneha: Velocity Spike
  ...[9, 8, 6, 4, 2].map((m, idx) => ({
    _id: `tx-s-${idx}`,
    accountId: "acc-sneha",
    userId: "user-sneha",
    type: "debit" as const,
    amount: 500 + idx * 150,
    category: "shopping",
    description: `Rapid Card Micro-Transaction #${idx + 1}`,
    recipient: "Digital Marketplace",
    riskScore: 20,
    flagReasons: [],
    status: "completed" as const,
    timestamp: new Date(now - m * 60000),
    createdAt: new Date(now - m * 60000),
    updatedAt: new Date(now - m * 60000),
  })),
  {
    _id: "tx-s-flagged",
    accountId: "acc-sneha",
    userId: "user-sneha",
    type: "debit",
    amount: 8500,
    category: "shopping",
    description: "Rapid Burst Transaction #6",
    recipient: "Digital Marketplace",
    riskScore: 60,
    flagReasons: [
      "Velocity spike detected: 5 transactions attempted within 10 minutes (threshold: 5)",
    ],
    status: "pending",
    timestamp: new Date(now - 1 * 60000),
    createdAt: new Date(now - 1 * 60000),
    updatedAt: new Date(now - 1 * 60000),
  },

  // Historical resolved for Admin view
  {
    _id: "tx-resolved-app",
    accountId: "acc-rahul",
    userId: "user-rahul",
    type: "debit",
    amount: 95000,
    category: "investment",
    description: "Pre-approved Mutual Fund Allocation",
    recipient: "HDFC Mutual Fund",
    riskScore: 55,
    flagReasons: [
      "High balance ratio: debit of ₹95,000 consumes 85% (>80%) of available balance",
    ],
    status: "completed",
    timestamp: new Date(now - 2 * 86400000),
    createdAt: new Date(now - 2 * 86400000),
    updatedAt: new Date(now - 2 * 86400000),
  },
  {
    _id: "tx-resolved-rej",
    accountId: "acc-arjun",
    userId: "user-arjun",
    type: "debit",
    amount: 72000,
    category: "transfer",
    description: "Suspicious Unauthorized International Wire",
    recipient: "QuickCash Unknown Entity",
    riskScore: 75,
    flagReasons: [
      'First-time transfer anomaly: ₹72,000 sent to unknown recipient "QuickCash Unknown Entity"',
      "Nocturnal execution pattern: transaction initiated at 03:15 AM",
    ],
    status: "rejected",
    timestamp: new Date(now - 3 * 86400000),
    createdAt: new Date(now - 3 * 86400000),
    updatedAt: new Date(now - 3 * 86400000),
  },
];

const initialAuditLogs: StoredAuditLog[] = [
  {
    _id: "log-1",
    adminId: "user-harshit",
    action: "approve",
    transactionId: "tx-resolved-app",
    note: "Customer confirmed investment intent via two-factor OTP verification.",
    timestamp: new Date(now - 2 * 86400000 + 1800000),
  },
  {
    _id: "log-2",
    adminId: "user-harshit",
    action: "reject",
    transactionId: "tx-resolved-rej",
    note: "Unrecognized international beneficiary flagged by suspicious nocturnal activity. Blocked per AML policy.",
    timestamp: new Date(now - 3 * 86400000 + 2400000),
  },
];

// Global singleton in-memory repository for Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __secureLedgerStore: {
    users: StoredUser[];
    accounts: StoredAccount[];
    transactions: StoredTransaction[];
    auditLogs: StoredAuditLog[];
  } | undefined;
}

if (!global.__secureLedgerStore) {
  global.__secureLedgerStore = {
    users: initialUsers,
    accounts: initialAccounts,
    transactions: initialTransactions,
    auditLogs: initialAuditLogs,
  };
}

export const memoryStore = global.__secureLedgerStore;
