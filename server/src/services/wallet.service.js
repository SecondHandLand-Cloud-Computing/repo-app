import { Wallet } from "../models/wallet.model.js";
import { AppError } from "../utils/AppError.js";

export const WalletService = {
  async getByUserId(userId) {
    const wallet = await Wallet.findOne({ userId: userId }).lean();
    return wallet;
  },

  async create(userId) {
    const wallet = await Wallet.create({ userId: userId });
    return wallet;
  },

  async update(userId, amount) {
    const wallet = await Wallet.findOne({ userId: userId });

    wallet.balance += amount;

    if (wallet.balance < 0) throw new AppError("Insufficient wallet balance", 400);
    await wallet.save();

    return wallet;
  },
};
