import { runFraudScreening } from "../lib/fraud-rules";

console.log("==================================================");
console.log("🧪 Testing Fraud Rules Engine in Isolation");
console.log("==================================================");

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
  }
}

// 1. Clean small grocery transaction
const cleanResult = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 50000,
  transaction: {
    type: "debit",
    amount: 1500,
    category: "food",
    description: "Supermarket shopping",
    timestamp: new Date("2026-09-17T14:30:00"),
  },
  recentTransactions: [],
  currentTime: new Date("2026-09-17T14:30:00"),
});
assert(!cleanResult.isFlagged, "Clean transaction should NOT be flagged");
assert(cleanResult.riskScore === 0, "Clean transaction riskScore should be 0");

// 2. High Amount Rule: > ₹1,00,000
const highAmountFixed = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 300000,
  transaction: {
    type: "debit",
    amount: 120000,
    category: "shopping",
    description: "Gold coin purchase",
    timestamp: new Date("2026-09-17T15:00:00"),
  },
  recentTransactions: [],
  currentTime: new Date("2026-09-17T15:00:00"),
});
assert(highAmountFixed.isFlagged, "High amount (> ₹100k) MUST be flagged");
assert(
  highAmountFixed.flagReasons.some((r) => r.includes("₹1,00,000")),
  "Flag reason must mention ₹1,00,000 threshold"
);

// 3. High Ratio Rule: > 80% balance
const highRatioResult = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 10000,
  transaction: {
    type: "debit",
    amount: 9000,
    category: "shopping",
    description: "Electronics",
    timestamp: new Date("2026-09-17T15:00:00"),
  },
  recentTransactions: [],
  currentTime: new Date("2026-09-17T15:00:00"),
});
assert(highRatioResult.isFlagged, "High ratio (> 80% of balance) MUST be flagged");

// 4. Velocity Rule: > 5 txns in last 10 mins
const nowMs = new Date("2026-09-17T16:00:00").getTime();
const rapidHistory = [1, 2, 3, 5, 7].map((m, idx) => ({
  _id: `tx-${idx}`,
  type: "debit" as const,
  amount: 200,
  category: "food" as const,
  status: "completed",
  timestamp: new Date(nowMs - m * 60000),
}));

const velocityResult = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 50000,
  transaction: {
    type: "debit",
    amount: 500,
    category: "food",
    description: "6th quick purchase",
    timestamp: new Date(nowMs),
  },
  recentTransactions: rapidHistory,
  currentTime: new Date(nowMs),
});
assert(velocityResult.isFlagged, "Velocity spike (>=5 in 10 mins) MUST be flagged");
assert(
  velocityResult.flagReasons.some((r) => r.includes("Velocity spike")),
  "Flag reason must mention velocity spike"
);

// 5. Round-Trip Structuring Rule
const roundTripResult = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 50000,
  transaction: {
    type: "credit",
    amount: 49800,
    category: "transfer",
    description: "Return of funds",
    timestamp: new Date(nowMs),
  },
  recentTransactions: [
    {
      _id: "tx-rt-1",
      type: "debit",
      amount: 50000,
      category: "transfer",
      status: "completed",
      timestamp: new Date(nowMs - 12 * 60000), // 12 mins ago
    },
  ],
  currentTime: new Date(nowMs),
});
assert(roundTripResult.isFlagged, "Round trip structuring within 30m MUST be flagged");

// 6. New Recipient + High Value Rule
const newRecipientResult = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 100000,
  transaction: {
    type: "debit",
    amount: 35000,
    category: "transfer",
    description: "Wire to new recipient",
    recipient: "Untrusted Merchant X",
    timestamp: new Date(nowMs),
  },
  recentTransactions: [
    {
      _id: "tx-past-1",
      type: "debit",
      amount: 1000,
      category: "transfer",
      recipient: "Trusted Friend A",
      status: "completed",
      timestamp: new Date(nowMs - 24 * 3600000),
    },
  ],
  currentTime: new Date(nowMs),
});
assert(newRecipientResult.isFlagged, "New recipient + >₹25,000 transfer MUST be flagged");

// 7. Odd Hours Rule (e.g. 02:30 AM)
const oddHoursResult = runFraudScreening({
  userId: "user-1",
  accountId: "acc-1",
  currentBalance: 50000,
  transaction: {
    type: "debit",
    amount: 20000,
    category: "shopping",
    description: "Middle of night purchase",
    timestamp: new Date("2026-09-17T02:30:00"),
  },
  recentTransactions: [],
  currentTime: new Date("2026-09-17T02:30:00"),
});
assert(oddHoursResult.isFlagged, "Odd hours debit >= ₹15,000 MUST be flagged");

console.log("==================================================");
console.log(`Results: ${passed} / ${total} tests passed!`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
