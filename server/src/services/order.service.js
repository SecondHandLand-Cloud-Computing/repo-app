import { Product } from "../models/product.model.js";
import { Customer } from "../models/customer.model.js";
import { Order } from "../models/order.model.js";
import { Wallet } from "../models/wallet.model.js";
import { Cart } from "../models/cart.model.js";
import { ProviderService } from "./provider.service.js";
import { InventoryService } from "./inventory.service.js";
import { RabbitMQService } from "./rabbitmq.service.js";

import { lockFailuresTotal, measureDB } from "../monitoring/dbMetrics.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const OrderService = {
  async create(userId, products, deliveryAddress) {
    const reservedProducts = [];
    const createdOrders = [];
    const jobs = [];

    try {
      // ── 1. Group cart items by seller ────────────────────────────────────
      const ordersBySeller = {};
      const productIds = [];

      for (const p of products) {
        const sellerId = p.createdBy.toString();
        if (!ordersBySeller[sellerId]) ordersBySeller[sellerId] = [];
        ordersBySeller[sellerId].push(p.id.toString());
        productIds.push(p.id);
      }

      // ── 2. Validate tất cả sản phẩm vẫn còn active ──────────────────────
      const dbProducts = await measureDB(
        "find",
        "products",
        Product.find({ _id: { $in: productIds }, status: "active" }).lean()
      );

      if (dbProducts.length !== productIds.length) {
        throw new AppError("Some products are no longer available", 400);
      }

      // ── 3. Atomic stock reservation qua Redis Lua script ─────────────────
      // Script kiểm tra và DECRBY trong một lần — không thể bị race condition
      await InventoryService.reserve(dbProducts);
      reservedProducts.push(...dbProducts);

      // ── 4. Kiểm tra số dư buyer trước khi xử lý ─────────────────────────
      const sellerEntries = Object.entries(ordersBySeller);
      let grandTotal = 0;
      const orderPlans = [];

      const sellers = await Customer.find({
        _id: { $in: sellerEntries.map(([id]) => id) },
      })
        .select("address")
        .lean();

      const sellerAddressMap = new Map(
        sellers.map((s) => [s._id.toString(), s.address || ""])
      );

      for (const [sellerId, sellerProductIds] of sellerEntries) {
        const sellerProducts = dbProducts.filter((p) =>
          sellerProductIds.includes(p._id.toString())
        );

        const subtotal = sellerProducts.reduce((s, p) => s + p.price, 0);
        const { providerId, shippingFee } =
          await ProviderService.calculateShippingFee(subtotal);
        const total = subtotal + shippingFee;
        grandTotal += total;

        orderPlans.push({ sellerId, sellerProducts, subtotal, total, providerId, shippingFee });
      }

      // ── 5. Trừ ví buyer — atomic: chỉ trừ nếu balance >= grandTotal ──────
      const wallet = await measureDB(
        "findOneAndUpdate",
        "wallets",
        Wallet.findOneAndUpdate(
          { userId, balance: { $gte: grandTotal } },
          { $inc: { balance: -grandTotal } },
          { new: true }
        )
      );

      if (!wallet) {
        throw new AppError("Insufficient balance", 400);
      }

      // ── 6. Tạo order + mark sold + cộng ví seller ────────────────────────
      for (const plan of orderPlans) {
        const { sellerId, sellerProducts, subtotal, total, providerId, shippingFee } = plan;

        // Mark products sold — condition guard chống race condition thứ 2
        await measureDB(
          "updateMany",
          "products",
          Product.updateMany(
            { _id: { $in: sellerProducts.map((p) => p._id) }, status: "active" },
            { $set: { status: "sold" } }
          )
        );

        const [order] = await measureDB(
          "create",
          "orders",
          Order.create([
            {
              ownerId: userId,
              sellerId,
              products: sellerProducts.map((p) => ({
                id: p._id,
                quantity: 1,
                priceAtOrder: p.price,
              })),
              subtotal,
              total,
              status: "created",
              shipping: {
                providerId,
                pickupAddress: sellerAddressMap.get(sellerId) || "",
                deliveryAddress,
                fee: shippingFee,
              },
            },
          ])
        );

        createdOrders.push(order);

        // Cộng ví seller
        await measureDB(
          "findOneAndUpdate",
          "wallets",
          Wallet.findOneAndUpdate(
            { userId: sellerId },
            { $inc: { balance: subtotal } },
            { upsert: true, new: true }
          )
        );

        jobs.push({
          orderId: order._id.toString(),
          userId,
          sellerId,
          subtotal,
          productIds: sellerProducts.map((p) => p._id.toString()),
        });
      }

      // ── 7. Xóa sản phẩm đã mua khỏi giỏ hàng ────────────────────────────
      await measureDB(
        "updateOne",
        "carts",
        Cart.updateOne(
          { userId },
          { $pull: { products: { id: { $in: productIds } } } }
        )
      );

      // ── 8. Publish sang RabbitMQ (sau khi commit xong) ───────────────────
      for (const job of jobs) {
        try {
          await RabbitMQService.publish(job);
        } catch (publishError) {
          logger.warn(
            `[RabbitMQ] publish failed for order ${job.orderId}: ${publishError.message}`
          );
        }
      }

      return createdOrders;
    } catch (err) {
      // Track lock/write-conflict metrics
      if (err.hasErrorLabel?.("TransientTransactionError") || err.code === 112) {
        lockFailuresTotal.inc();
      }

      // Hoàn trả stock Redis nếu đã reserve
      if (reservedProducts.length > 0) {
        try {
          await InventoryService.release(reservedProducts);
        } catch (releaseError) {
          logger.warn(`[Inventory] release failed: ${releaseError.message}`);
        }
      }

      // Xóa order đã tạo nếu bị lỗi sau bước tạo order
      if (createdOrders.length > 0) {
        await Order.deleteMany({
          _id: { $in: createdOrders.map((o) => o._id) },
        }).catch((e) => logger.warn(`[Order] rollback failed: ${e.message}`));
      }

      throw err;
    }
  },

  async getList(user, page, limit, status) {
    const skip = (page - 1) * limit;
    const filter = {};

    if (user.role === "customer") filter.ownerId = user.id;
    if (status) filter.status = status;

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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};
