# SecureLedger 🛡️
### Intelligent Fintech Ledger & Synchronous Fraud Detection Engine

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://secure-ledger-six.vercel.app)
[![Login Portal](https://img.shields.io/badge/Login_Portal-Online-blue?style=for-the-badge&logo=nextdotjs)](https://secure-ledger-six.vercel.app/login)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

> 🚀 **Live Production App**: [**https://secure-ledger-six.vercel.app**](https://secure-ledger-six.vercel.app)  
> 🔑 **Live Login Portal**: [**https://secure-ledger-six.vercel.app/login**](https://secure-ledger-six.vercel.app/login)  
> *(One-click demo buttons are enabled on the live site — click **Harshit (Admin)** with password **`123`** to test immediately)*

**SecureLedger** is a full-stack personal banking ledger and expense tracker built with Next.js 14 (App Router), TypeScript, and MongoDB. Unlike standard expense trackers, SecureLedger features an institutional-grade, **rule-based fraud and anomaly detection screening engine** running synchronously on every transaction. High-risk transactions are quarantined in escrow pending auditor review, while clean transactions settle immediately with race-condition-safe atomic balance updates.

---

## 🌟 Highlights & Key Architectural Decisions

1. **Modular Fraud Rules Engine (`lib/fraud-rules/`)**:
   - Every rule is decoupled into its own module with isolated logic, parameterization, and structured return values.
   - Evaluates risk along multiple vectors: capital drain ratio, burst velocity, round-trip structuring/layering, unknown recipient risk, and nocturnal timing.
   - Compounds individual rule scores using a diminishing-returns model into an aggregate Risk Score (0–100) with clear human-readable reason codes.

2. **Immutable Ledger & Atomic Writes**:
   - **Zero In-Place Mutation or Deletion**: In accordance with real banking ledger compliance, transactions cannot be edited or deleted once created. Corrections require offsetting reversal entries.
   - **Atomic Balance Updates**: Uses conditional MongoDB queries (`findOneAndUpdate` with `$inc` and balance boundary checks) to guarantee ledger integrity and eliminate race conditions on concurrent writes.

3. **Auditor Adjudication & Compliance Audit Trail**:
   - Dedicated `/admin` auditor console protected by server-side role validation.
   - Auditors can approve or reject flagged transactions with compliance justification notes.
   - Every adjudication is recorded permanently in a dedicated `AuditLog` collection.

4. **Visual Analytics with Recharts**:
   - Interactive category expense breakdown donut chart.
   - Time-series transaction volume and cash flow trend chart.
   - Admin fraud vector distribution bar chart.

---

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 14+ (App Router) with server-side API routes (no separate Express server)
- **Language**: TypeScript throughout
- **Database**: MongoDB Atlas / MongoDB accessed via Mongoose with cached connection pooling
- **Authentication**: NextAuth.js (Credentials Provider) with JWT sessions and bcrypt (min 10 salt rounds)
- **Validation**: Zod for all API input boundaries
- **Styling**: Tailwind CSS (dark mode fintech aesthetic)
- **Charts**: Recharts
- **Deployment**: Vercel-ready with zero local filesystem or ephemeral in-memory state reliance

---

## 🧠 Fraud Detection Rules Explained (Interview Guide)

The rules engine resides in [`lib/fraud-rules/`](file:///c:/Users/harsh/OneDrive/Desktop/SecureLedger/lib/fraud-rules/) and runs synchronously before ledger settlement. Transactions with `riskScore >= 50` are quarantined as `status: "pending"`, withholding the debit until an auditor adjudicates.

### 1. High Amount Rule (`high-amount.ts`)
- **Objective**: Prevent catastrophic account drainage and unauthorized high-ticket withdrawals.
- **Trigger**:
  1. Transaction amount exceeds **80% of current available balance**, OR
  2. Transaction amount exceeds the fixed anomaly threshold of **₹1,00,000**.
- **Score Contribution**: +50 to +60 points.

### 2. Velocity Spike Rule (`velocity.ts`)
- **Objective**: Detect automated script attacks, card-testing loops, or unauthorized burst drains.
- **Trigger**: More than 5 transactions attempted by the user within a rolling **10-minute window**.
- **Score Contribution**: +55 points.

### 3. Round-Trip Structuring Rule (`round-trip.ts`)
- **Objective**: Detect money laundering structuring or layering behaviors (smurfing/round-tripping).
- **Trigger**: A debit is immediately followed by a credit of similar value (within ±5% tolerance) within a **30-minute window**, or vice versa.
- **Score Contribution**: +55 points.

### 4. New Recipient + High Value Rule (`new-recipient.ts`)
- **Objective**: Catch unauthorized account takeovers where funds are wired to unfamiliar beneficiary accounts.
- **Trigger**: An outbound transfer directed to a recipient the user has **never transacted with before**, AND the amount is **≥ ₹25,000**.
- **Score Contribution**: +55 points.

### 5. Odd Hours Nocturnal Rule (`odd-hours.ts`)
- **Objective**: Flag transactions occurring during high-risk nocturnal windows (typical of automated card drainers or compromised sessions).
- **Trigger**: Transaction executed between **12:00 AM (00:00) and 05:00 AM (04:59)** local time.
- **Score Contribution**: +35 points (elevated to +50 points if combined with a debit ≥ ₹15,000).

---

## 🗄️ Database Schemas & Collections

- `users`: `email` (unique index), `passwordHash`, `name`, `role` (`user` | `admin`), `createdAt`.
- `accounts`: `userId` (ref User, index), `accountNumber` (unique), `balance`, `accountType` (`savings` | `current`), `currency` (`INR`).
- `transactions`: `accountId` (ref Account), `userId` (ref User, compound index with timestamp), `type` (`credit` | `debit`), `amount`, `category`, `description`, `recipient`, `riskScore`, `flagReasons[]`, `status` (`completed` | `pending` | `rejected`), `timestamp` (index).
- `auditlogs`: `adminId` (ref User), `action` (`approve` | `reject`), `transactionId` (ref Transaction), `note`, `timestamp` (index).

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js 18+ or 20+
- MongoDB instance (MongoDB Atlas free tier or local MongoDB server)

### 2. Installation
```bash
git clone <repository-url>
cd SecureLedger
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/secureledger
NEXTAUTH_SECRET=your_super_secret_jwt_key_min_32_characters
NEXTAUTH_URL=http://localhost:3000

ADMIN_EMAIL=admin@secureledger.com
ADMIN_PASSWORD=Admin@123
```

### 4. Seed the Database
Populate the database with pre-configured demo users and realistic fraud scenarios:
```bash
npm run seed
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Accounts Reference

| Role | Email | Password | Scenario / Characteristics |
| :--- | :--- | :--- | :--- |
| **Auditor Admin** | `admin@secureledger.com` | `Admin@123` | Access to `/admin` queue, rule distribution chart, approve/reject actions, and audit trail. |
| **Demo User 1** | `rahul@example.com` | `User@123` | **High Amount Anomaly**: Pre-seeded with a ₹1,25,000 luxury purchase held pending review. |
| **Demo User 2** | `priya@example.com` | `User@123` | **Round-Trip Structuring**: Pre-seeded with a ₹47,900 return closely mirroring an earlier ₹48,000 debit. |
| **Demo User 3** | `arjun@example.com` | `User@123` | **New Recipient + 3 AM Nocturnal**: Flagged for a ₹45,000 transfer to an unknown overseas escrow at 02:45 AM. |
| **Demo User 4** | `sneha@example.com` | `User@123` | **Velocity Spike**: 5 rapid micro-transactions followed by a 6th transaction flagged by the burst limit. |

*You can also click any of the one-click demo login buttons on the `/login` page.*

---

## ☁️ MongoDB Atlas Free Tier Setup Guide

If deploying or using MongoDB Atlas:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Build a **Shared M0 Cluster** (free tier).
3. Under **Security → Database Access**:
   - Click **Add New Database User**.
   - Select **Password Authentication**.
   - Create a username (e.g. `secureledger_admin`) and secure password.
   - Assign `readWriteAnyDatabase` privileges.
4. Under **Security → Network Access**:
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so Vercel's serverless functions can connect.
5. Under **Database → Clusters**:
   - Click **Connect** → **Drivers** (Node.js).
   - Copy the connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/secureledger?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password and update `MONGODB_URI` in `.env.local` and in Vercel.

---

## 🚢 Vercel Deployment Instructions

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SecureLedger"
   git remote add origin https://github.com/<your-username>/secure-ledger.git
   git push -u origin main
   ```
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
   - Select your GitHub repository.
   - Framework preset will automatically detect **Next.js**.
3. **Configure Environment Variables**:
   In the Vercel project configuration, add:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `NEXTAUTH_SECRET`: A generated 32+ character random string.
   - `NEXTAUTH_URL`: Your Vercel deployment URL (e.g., `https://secure-ledger.vercel.app`).
   - `ADMIN_EMAIL`: `admin@secureledger.com`
   - `ADMIN_PASSWORD`: Your chosen admin password.
4. **Deploy**:
   - Click **Deploy**. Vercel will build and launch the serverless application.
   - Once deployed, run the seed script pointing to your Atlas URI (`MONGODB_URI="mongodb+srv://..." npm run seed`).

---

## 🔮 Future Extensions

- **Machine Learning Integration**: Complement the rule-based engine with an unsupervised anomaly detection model (e.g., Isolation Forest or Autoencoders trained on behavioral spending fingerprints).
- **Real-Time Webhooks & Push Alerts**: Integrate WebSockets/Pusher to instantly alert users when a transaction is quarantined.
- **Biometric 2FA Step-Up Authentication**: Allow users to self-clear low-to-medium risk flags by completing a WebAuthn passkey step-up challenge.
