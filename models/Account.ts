import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  accountNumber: string;
  balance: number;
  accountType: "savings" | "current";
  currency: string;
  createdAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 50000,
      min: [0, "Account balance cannot be negative"],
    },
    accountType: {
      type: String,
      enum: ["savings", "current"],
      default: "savings",
    },
    currency: {
      type: String,
      default: "INR",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Account: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);

export default Account;
