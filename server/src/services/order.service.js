import mongoose from "mongoose";

import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { Wallet } from "../models/wallet.model.js";
import { ProviderService } from "./provider.service.js";

import { dbQueryDurationSeconds, dbActiveConnections, lockFailuresTotal } from "../monitoring/dbMetrics.js";

import { AppError } from "../utils/AppError.js";

export const OrderService = {
  async create(userId, products, deliveryAddress) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // group by seller
      const ordersBySeller = {};
      for (const p of products) {
        const sellerId = p.createdBy.toString();
        if (!ordersBySeller[sellerId]) ordersBySeller[sellerId] = [];
        ordersBySeller[sellerId].push(p.id);
      }

      let grandTotal = 0;
      const createdOrders = [];

      for (const sellerId in ordersBySeller) {
        const start = process.hrtime();
        // re-fetch product
        const dbProducts = await Product.find({
          _id: { $in: ordersBySeller[sellerId] },
          status: "active",
        }).session(session);

        const diff = process.hrtime(start); // tính thời gian từ start đến thời điểm hiện tại. Trả về [seconds, nanoseconds]
        const duration = diff[0] + diff[1] / 1e9; // quy chuẩn về giây cho Prometheus
        dbQueryDurationSeconds.labels("find", "products_for_order").observe(duration)
        

        if (dbProducts.length !== ordersBySeller[sellerId].length) {
          throw new AppError("Some products are no longer available", 400);
        }

        const subtotal = dbProducts.reduce((s, p) => s + p.price, 0);
        const { providerId, shippingFee } = await ProviderService.calculateShippingFee(subtotal);

        const total = subtotal + shippingFee;
        grandTotal += total;

        // create order
        const [order] = await Order.create(
          [
            {
              ownerId: userId,
              products: dbProducts.map((p) => ({ id: p._id })),
              subtotal,
              shipping: {
                providerId,
                pickupAddress: dbProducts[0].address,
                deliveryAddress,
                fee: shippingFee,
              },
            },
          ],
          { session }
        );

        createdOrders.push(order);

        // mark product sold
        await Product.updateMany(
          { _id: { $in: dbProducts.map((p) => p._id) } },
          { status: "sold" },
          { session }
        );

        // credit seller wallet (no escrow)
        await Wallet.findOneAndUpdate(
          { userId: sellerId },
          { $inc: { balance: subtotal } },
          { session, upsert: true }
        );
      }

      // deduct wallet (atomic)
      const wallet = await Wallet.findOneAndUpdate(
        { userId, balance: { $gte: grandTotal } },
        { $inc: { balance: -grandTotal } },
        { session, new: true }
      );

      if (!wallet) throw new AppError("Insufficient balance", 400);

      // remove cart
      await Cart.updateOne(
        { userId },
        { $pull: { products: { id: { $in: products.map((p) => p.id) } } } },
        { session }
      );

      await session.commitTransaction();
      return createdOrders;
    } catch (err) {
      await session.abortTransaction();

      // Lỗi văng ra do tranh chấp dữ liệu → tăng lockFailuresTotal
      if (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')) {
        lockFailuresTotal.inc();
      }
      // lỗi Insufficient balance → tăng lockFailuresTotal
      if (err.message === "Insufficient balance" || err.message === "Some products are no longer available") {
        lockFailuresTotal.inc();
      }

      throw err;
    } finally {
      session.endSession();
    }
  },

  async getList(user, page, limit, status) {
    const skip = (page - 1) * limit;
    const filter = {};

    // role-based filter
    if (user.role === "customer") {
      filter.ownerId = user.id;
    }

    if (status) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("products.id", "name price imagePublicId")
        .populate("shipping.providerId", "name")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
