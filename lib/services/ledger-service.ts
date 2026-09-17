import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import Transaction, { TransactionType, TransactionCategory } from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";
import {
  memoryStore,
  StoredUser,
  StoredAccount,
  StoredTransaction,
  StoredAuditLog,
} from "@/lib/store";
import { runFraudScreening } from "@/lib/fraud-rules";

async function isMongoConnected(): Promise<boolean> {
  try {
    const conn = await connectToDatabase();
    return conn.connection.readyState === 1;
  } catch (err) {
    return false;
  }
}

// 1. User Lookups
export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const user = await User.findOne({ email: normalized });
    if (user) {
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
      };
    }
  }

  // Fallback to in-memory store
  const stored = memoryStore.users.find(
    (u) => u.email.toLowerCase() === normalized
  );
  if (!stored) return null;

  return {
    id: stored._id,
    name: stored.name,
    email: stored.email,
    passwordHash: stored.passwordHash,
    role: stored.role,
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  accountType: "savings" | "current";
}) {
  const normalized = data.email.trim().toLowerCase();
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const existing = await User.findOne({ email: normalized });
    if (existing) throw new Error("An account with this email already exists");

    const user = await User.create({
      name: data.name,
      email: normalized,
      passwordHash: data.passwordHash,
      role: "user",
    });

    const randomSegment1 = Math.floor(1000 + Math.random() * 9000);
    const randomSegment2 = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `SL-${randomSegment1}-${randomSegment2}`;

    const account = await Account.create({
      userId: user._id,
      accountNumber,
      balance: 50000,
      accountType: data.accountType,
      currency: "INR",
    });

    return {
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
      account: { id: account._id.toString(), accountNumber: account.accountNumber, balance: account.balance },
    };
  }

  // In-memory fallback
  const existing = memoryStore.users.find((u) => u.email.toLowerCase() === normalized);
  if (existing) throw new Error("An account with this email already exists");

  const newId = `user-${Date.now()}`;
  const newUser: StoredUser = {
    _id: newId,
    name: data.name,
    email: normalized,
    passwordHash: data.passwordHash,
    role: "user",
    createdAt: new Date(),
  };
  memoryStore.users.push(newUser);

  const accId = `acc-${Date.now()}`;
  const randomSegment1 = Math.floor(1000 + Math.random() * 9000);
  const randomSegment2 = Math.floor(1000 + Math.random() * 9000);
  const accountNumber = `SL-${randomSegment1}-${randomSegment2}`;

  const newAccount: StoredAccount = {
    _id: accId,
    userId: newId,
    accountNumber,
    balance: 50000,
    accountType: data.accountType,
    currency: "INR",
    createdAt: new Date(),
  };
  memoryStore.accounts.push(newAccount);

  return {
    user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
    account: { id: newAccount._id, accountNumber: newAccount.accountNumber, balance: newAccount.balance },
  };
}

// 2. Account & Metrics
export async function getAccountSummary(userId: string) {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const account = await Account.findOne({ userId: userObjectId });
    if (!account) return null;

    const pendingTransactions = await Transaction.find({
      userId: userObjectId,
      status: "pending",
    });
    const pendingDebitTotal = pendingTransactions
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + t.amount, 0);

    const completed = await Transaction.find({
      userId: userObjectId,
      status: "completed",
    });
    const totalDebited = completed.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    const totalCredited = completed.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);

    return {
      id: account._id.toString(),
      accountNumber: account.accountNumber,
      balance: account.balance,
      availableBalance: Math.max(0, account.balance - pendingDebitTotal),
      pendingDebitTotal,
      pendingCount: pendingTransactions.length,
      accountType: account.accountType,
      currency: account.currency,
      totalDebited,
      totalCredited,
    };
  }

  // In-memory fallback
  const account = memoryStore.accounts.find((a) => a.userId === userId);
  if (!account) return null;

  const userTxs = memoryStore.transactions.filter((t) => t.userId === userId);
  const pendingTxs = userTxs.filter((t) => t.status === "pending");
  const pendingDebitTotal = pendingTxs
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  const completedTxs = userTxs.filter((t) => t.status === "completed");
  const totalDebited = completedTxs.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const totalCredited = completedTxs.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);

  return {
    id: account._id,
    accountNumber: account.accountNumber,
    balance: account.balance,
    availableBalance: Math.max(0, account.balance - pendingDebitTotal),
    pendingDebitTotal,
    pendingCount: pendingTxs.length,
    accountType: account.accountType,
    currency: account.currency,
    totalDebited,
    totalCredited,
  };
}

// 3. Transactions Query & Processing
export async function getTransactions(
  userId: string,
  options: {
    category?: string;
    type?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }
) {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const query: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (options.category && options.category !== "all") query.category = options.category;
    if (options.type && options.type !== "all") query.type = options.type;
    if (options.status && options.status !== "all") query.status = options.status;
    if (options.search) {
      query.$or = [
        { description: { $regex: options.search, $options: "i" } },
        { recipient: { $regex: options.search, $options: "i" } },
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean();

    return {
      transactions: transactions.map((t) => ({
        ...t,
        _id: t._id.toString(),
        userId: t.userId.toString(),
        accountId: t.accountId.toString(),
      })),
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit) || 1,
      },
    };
  }

  // In-memory fallback
  let filtered = memoryStore.transactions.filter((t) => t.userId === userId);
  if (options.category && options.category !== "all") {
    filtered = filtered.filter((t) => t.category === options.category);
  }
  if (options.type && options.type !== "all") {
    filtered = filtered.filter((t) => t.type === options.type);
  }
  if (options.status && options.status !== "all") {
    filtered = filtered.filter((t) => t.status === options.status);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.recipient && t.recipient.toLowerCase().includes(q))
    );
  }

  // Sort by timestamp desc
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = filtered.length;
  const start = (options.page - 1) * options.limit;
  const paginated = filtered.slice(start, start + options.limit);

  return {
    transactions: paginated,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1,
    },
  };
}

export async function processTransaction(data: {
  userId: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description: string;
  recipient?: string;
  simulatedTimestamp?: string;
}) {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const userObjectId = new mongoose.Types.ObjectId(data.userId);
    const account = await Account.findOne({ userId: userObjectId });
    if (!account) throw new Error("Active account not found");

    if (data.type === "debit" && account.balance < data.amount) {
      throw new Error(
        `Insufficient funds. Account balance is ₹${account.balance.toLocaleString(
          "en-IN"
        )}, but attempted transaction is ₹${data.amount.toLocaleString("en-IN")}.`
      );
    }

    const recentTxns = await Transaction.find({ userId: userObjectId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const txDate = data.simulatedTimestamp ? new Date(data.simulatedTimestamp) : new Date();

    const evaluation = runFraudScreening({
      userId: data.userId,
      accountId: account._id.toString(),
      currentBalance: account.balance,
      transaction: {
        type: data.type,
        amount: data.amount,
        category: data.category,
        description: data.description,
        recipient: data.recipient,
        timestamp: txDate,
      },
      recentTransactions: recentTxns.map((t) => ({
        _id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        category: t.category,
        recipient: t.recipient,
        status: t.status,
        timestamp: t.timestamp,
      })),
      currentTime: txDate,
    });

    const isFlagged = evaluation.isFlagged;
    const initialStatus = isFlagged ? "pending" : "completed";

    if (!isFlagged) {
      if (data.type === "debit") {
        await Account.findOneAndUpdate(
          { _id: account._id, balance: { $gte: data.amount } },
          { $inc: { balance: -data.amount } }
        );
      } else {
        await Account.findByIdAndUpdate(account._id, { $inc: { balance: data.amount } });
      }
    }

    const newTx = await Transaction.create({
      accountId: account._id,
      userId: userObjectId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description,
      recipient: data.recipient || "",
      riskScore: evaluation.riskScore,
      flagReasons: evaluation.flagReasons,
      status: initialStatus,
      timestamp: txDate,
    });

    return {
      message: isFlagged
        ? "Transaction flagged by fraud rules engine and placed in pending auditor review."
        : "Transaction processed and ledger updated successfully.",
      isFlagged,
      riskScore: evaluation.riskScore,
      flagReasons: evaluation.flagReasons,
      rulesBreakdown: evaluation.rules,
      transaction: newTx,
    };
  }

  // In-memory fallback
  const account = memoryStore.accounts.find((a) => a.userId === data.userId);
  if (!account) throw new Error("Active account not found");

  if (data.type === "debit" && account.balance < data.amount) {
    throw new Error(
      `Insufficient funds. Account balance is ₹${account.balance.toLocaleString(
        "en-IN"
      )}, but attempted transaction is ₹${data.amount.toLocaleString("en-IN")}.`
    );
  }

  const userRecentTxs = memoryStore.transactions
    .filter((t) => t.userId === data.userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const txDate = data.simulatedTimestamp ? new Date(data.simulatedTimestamp) : new Date();

  const evaluation = runFraudScreening({
    userId: data.userId,
    accountId: account._id,
    currentBalance: account.balance,
    transaction: {
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description,
      recipient: data.recipient,
      timestamp: txDate,
    },
    recentTransactions: userRecentTxs.map((t) => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      category: t.category as TransactionCategory,
      recipient: t.recipient,
      status: t.status,
      timestamp: t.timestamp,
    })),
    currentTime: txDate,
  });

  const isFlagged = evaluation.isFlagged;
  const initialStatus = isFlagged ? "pending" : "completed";

  if (!isFlagged) {
    if (data.type === "debit") {
      account.balance -= data.amount;
    } else {
      account.balance += data.amount;
    }
  }

  const newTx: StoredTransaction = {
    _id: `tx-${Date.now()}`,
    accountId: account._id,
    userId: data.userId,
    type: data.type,
    amount: data.amount,
    category: data.category,
    description: data.description,
    recipient: data.recipient || "",
    riskScore: evaluation.riskScore,
    flagReasons: evaluation.flagReasons,
    status: initialStatus,
    timestamp: txDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.transactions.unshift(newTx);

  return {
    message: isFlagged
      ? "Transaction flagged by fraud rules engine and placed in pending auditor review."
      : "Transaction processed and ledger updated successfully.",
    isFlagged,
    riskScore: evaluation.riskScore,
    flagReasons: evaluation.flagReasons,
    rulesBreakdown: evaluation.rules,
    transaction: newTx,
  };
}

// 4. Admin Intelligence & Adjudication
export async function getAdminFlaggedTransactions(
  statusFilter: "pending" | "resolved" | "all" = "pending",
  sortBy: string = "riskScore",
  order: number = -1
) {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const query: Record<string, any> = {};
    if (statusFilter === "pending") query.status = "pending";
    else if (statusFilter === "resolved") {
      query.status = { $in: ["completed", "rejected"] };
      query.riskScore = { $gte: 50 };
    } else if (statusFilter === "all") {
      query.riskScore = { $gte: 30 };
    }

    const sortObject: Record<string, any> = {};
    if (sortBy === "riskScore") sortObject.riskScore = order;
    else if (sortBy === "amount") sortObject.amount = order;
    else sortObject.timestamp = order;

    const txs = await Transaction.find(query)
      .sort(sortObject)
      .populate("userId", "name email role")
      .populate("accountId", "accountNumber balance accountType")
      .lean();

    return txs.map((t: any) => ({
      _id: t._id.toString(),
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description,
      recipient: t.recipient,
      riskScore: t.riskScore,
      flagReasons: t.flagReasons,
      status: t.status,
      timestamp: t.timestamp,
      user: t.userId ? { id: t.userId._id?.toString(), name: t.userId.name, email: t.userId.email } : null,
      account: t.accountId ? { id: t.accountId._id?.toString(), accountNumber: t.accountId.accountNumber, balance: t.accountId.balance, accountType: t.accountId.accountType } : null,
    }));
  }

  // In-memory fallback
  let items = memoryStore.transactions.filter((t) => {
    if (statusFilter === "pending") return t.status === "pending";
    if (statusFilter === "resolved") return (t.status === "completed" || t.status === "rejected") && t.riskScore >= 50;
    return t.riskScore >= 30;
  });

  items.sort((a, b) => {
    let diff = 0;
    if (sortBy === "riskScore") diff = a.riskScore - b.riskScore;
    else if (sortBy === "amount") diff = a.amount - b.amount;
    else diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return order === 1 ? diff : -diff;
  });

  return items.map((t) => {
    const user = memoryStore.users.find((u) => u._id === t.userId);
    const account = memoryStore.accounts.find((a) => a._id === t.accountId);
    return {
      ...t,
      user: user ? { id: user._id, name: user.name, email: user.email } : null,
      account: account ? { id: account._id, accountNumber: account.accountNumber, balance: account.balance, accountType: account.accountType } : null,
    };
  });
}

export async function adjudicateTransaction(
  adminId: string,
  transactionId: string,
  action: "approve" | "reject",
  note?: string
) {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const tx = await Transaction.findById(transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.status !== "pending") throw new Error(`Transaction is already finalized (${tx.status})`);

    const account = await Account.findById(tx.accountId);
    if (!account) throw new Error("Associated account not found");

    if (action === "approve") {
      if (tx.type === "debit") {
        if (account.balance < tx.amount) {
          throw new Error(`Insufficient funds: account balance ₹${account.balance} is below ₹${tx.amount}`);
        }
        await Account.findOneAndUpdate(
          { _id: account._id, balance: { $gte: tx.amount } },
          { $inc: { balance: -tx.amount } }
        );
      } else {
        await Account.findByIdAndUpdate(account._id, { $inc: { balance: tx.amount } });
      }
      tx.status = "completed";
      await tx.save();
    } else {
      tx.status = "rejected";
      await tx.save();
    }

    const audit = await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId),
      action,
      transactionId: tx._id,
      note: note || (action === "approve" ? "Transaction verified and approved by auditor." : "Transaction rejected due to fraud risk policy violation."),
      timestamp: new Date(),
    });

    return { transaction: tx, auditLog: audit };
  }

  // In-memory fallback
  const tx = memoryStore.transactions.find((t) => t._id === transactionId);
  if (!tx) throw new Error("Transaction not found");
  if (tx.status !== "pending") throw new Error(`Transaction is already finalized (${tx.status})`);

  const account = memoryStore.accounts.find((a) => a._id === tx.accountId);
  if (!account) throw new Error("Associated account not found");

  if (action === "approve") {
    if (tx.type === "debit") {
      if (account.balance < tx.amount) {
        throw new Error(`Insufficient funds: account balance ₹${account.balance} is below ₹${tx.amount}`);
      }
      account.balance -= tx.amount;
    } else {
      account.balance += tx.amount;
    }
    tx.status = "completed";
  } else {
    tx.status = "rejected";
  }

  const auditRecord: StoredAuditLog = {
    _id: `log-${Date.now()}`,
    adminId,
    action,
    transactionId: tx._id,
    note: note || (action === "approve" ? "Transaction verified and approved by auditor." : "Transaction rejected due to fraud risk policy violation."),
    timestamp: new Date(),
  };
  memoryStore.auditLogs.unshift(auditRecord);

  return { transaction: tx, auditLog: auditRecord };
}

export async function getAdminAnalytics() {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const pendingTxs = await Transaction.find({ status: "pending" }).lean();
    const pendingCount = pendingTxs.length;
    const pendingValue = pendingTxs.reduce((a, t) => a + t.amount, 0);

    const allFlagged = await Transaction.find({
      $or: [{ riskScore: { $gte: 50 } }, { status: "pending" }],
    }).lean();

    const ruleFrequencies: Record<string, number> = {
      "High Amount Rule": 0,
      "Velocity Spike Rule": 0,
      "Round-Trip Structuring Rule": 0,
      "New Recipient High-Value Rule": 0,
      "Odd Hours Rule": 0,
    };

    allFlagged.forEach((tx) => {
      tx.flagReasons.forEach((r) => {
        if (r.includes("₹1,00,000") || r.includes("80%")) ruleFrequencies["High Amount Rule"]++;
        else if (r.includes("Velocity") || r.includes("minutes")) ruleFrequencies["Velocity Spike Rule"]++;
        else if (r.includes("round-trip") || r.includes("structuring")) ruleFrequencies["Round-Trip Structuring Rule"]++;
        else if (r.includes("recipient") || r.includes("trust score")) ruleFrequencies["New Recipient High-Value Rule"]++;
        else if (r.includes("Nocturnal") || r.includes("12:00 AM")) ruleFrequencies["Odd Hours Rule"]++;
      });
    });

    let mostCommonRule = "None";
    let maxCount = 0;
    for (const [r, c] of Object.entries(ruleFrequencies)) {
      if (c > maxCount) {
        maxCount = c;
        mostCommonRule = r;
      }
    }

    const approvedCount = await AuditLog.countDocuments({ action: "approve" });
    const rejectedCount = await AuditLog.countDocuments({ action: "reject" });
    const totalTransactions = await Transaction.countDocuments();

    return {
      pendingCount,
      pendingValue,
      totalFlaggedCount: allFlagged.length,
      totalTransactions,
      mostCommonRule,
      ruleFrequencies: Object.entries(ruleFrequencies).map(([name, count]) => ({ name, count })),
      adjudicationStats: { approved: approvedCount, rejected: rejectedCount },
    };
  }

  // In-memory fallback
  const pendingTxs = memoryStore.transactions.filter((t) => t.status === "pending");
  const pendingCount = pendingTxs.length;
  const pendingValue = pendingTxs.reduce((a, t) => a + t.amount, 0);

  const allFlagged = memoryStore.transactions.filter(
    (t) => t.riskScore >= 50 || t.status === "pending"
  );

  const ruleFrequencies: Record<string, number> = {
    "High Amount Rule": 0,
    "Velocity Spike Rule": 0,
    "Round-Trip Structuring Rule": 0,
    "New Recipient High-Value Rule": 0,
    "Odd Hours Rule": 0,
  };

  allFlagged.forEach((tx) => {
    tx.flagReasons.forEach((r) => {
      if (r.includes("₹1,00,000") || r.includes("80%")) ruleFrequencies["High Amount Rule"]++;
      else if (r.includes("Velocity") || r.includes("minutes")) ruleFrequencies["Velocity Spike Rule"]++;
      else if (r.includes("round-trip") || r.includes("structuring")) ruleFrequencies["Round-Trip Structuring Rule"]++;
      else if (r.includes("recipient") || r.includes("trust score")) ruleFrequencies["New Recipient High-Value Rule"]++;
      else if (r.includes("Nocturnal") || r.includes("12:00 AM") || r.includes("02:45 AM")) ruleFrequencies["Odd Hours Rule"]++;
    });
  });

  let mostCommonRule = "None";
  let maxCount = 0;
  for (const [r, c] of Object.entries(ruleFrequencies)) {
    if (c > maxCount) {
      maxCount = c;
      mostCommonRule = r;
    }
  }

  const approvedCount = memoryStore.auditLogs.filter((a) => a.action === "approve").length;
  const rejectedCount = memoryStore.auditLogs.filter((a) => a.action === "reject").length;

  return {
    pendingCount,
    pendingValue,
    totalFlaggedCount: allFlagged.length,
    totalTransactions: memoryStore.transactions.length,
    mostCommonRule,
    ruleFrequencies: Object.entries(ruleFrequencies).map(([name, count]) => ({ name, count })),
    adjudicationStats: { approved: approvedCount, rejected: rejectedCount },
  };
}

export async function getAuditLogs(limit: number = 50) {
  const mongoActive = await isMongoConnected();

  if (mongoActive) {
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("adminId", "name email")
      .populate("transactionId", "amount type category description recipient status riskScore")
      .lean();

    return logs.map((log: any) => ({
      _id: log._id.toString(),
      action: log.action,
      note: log.note,
      timestamp: log.timestamp,
      admin: log.adminId ? { id: log.adminId._id?.toString(), name: log.adminId.name, email: log.adminId.email } : null,
      transaction: log.transactionId ? { id: log.transactionId._id?.toString(), amount: log.transactionId.amount, type: log.transactionId.type, category: log.transactionId.category, description: log.transactionId.description, status: log.transactionId.status, riskScore: log.transactionId.riskScore } : null,
    }));
  }

  // In-memory fallback
  const logs = memoryStore.auditLogs.slice(0, limit);
  return logs.map((log) => {
    const admin = memoryStore.users.find((u) => u._id === log.adminId);
    const transaction = memoryStore.transactions.find((t) => t._id === log.transactionId);
    return {
      _id: log._id,
      action: log.action,
      note: log.note,
      timestamp: log.timestamp,
      admin: admin ? { id: admin._id, name: admin.name, email: admin.email } : null,
      transaction: transaction ? { id: transaction._id, amount: transaction.amount, type: transaction.type, category: transaction.category, description: transaction.description, status: transaction.status, riskScore: transaction.riskScore } : null,
    };
  });
}
