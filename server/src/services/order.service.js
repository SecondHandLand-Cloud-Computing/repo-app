import { Product } from "../models/product.model.js";
import { Customer } from "../models/customer.model.js";
import { Order } from "../models/order.model.js";
import { Wallet } from "../models/wallet.model.js";
import { ProviderService } from "./provider.service.js";
import { InventoryService } from "./inventory.service.js";
import { RabbitMQService } from "./rabbitmq.service.js";

import { lockFailuresTotal, measureDB } from "../monitoring/dbMetrics.js";

import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const OrderService = {
  async create(userId, products, deliveryAddress) {
    const reservedProducts = [];
    const jobs = [];
    const createdOrders = [];

    try {
      // group by seller
      const ordersBySeller = {};
      const productIds = [];
      for (const p of products) {
        const sellerId = p.createdBy.toString();
        if (!ordersBySeller[sellerId]) ordersBySeller[sellerId] = [];
        
        // FIX: Đẩy nguyên Object { id, quantity } vào mảng thay vì chỉ đẩy mỗi id
        // Để giữ lại thông tin số lượng khách muốn mua
        ordersBySeller[sellerId].push({ id: p.id, quantity: p.quantity || 1 });
        productIds.push(p.id);
      }

      const dbProducts = await Product.find({
        _id: { $in: productIds },
        status: "active",
      }).lean();

      if (dbProducts.length !== productIds.length) {
        throw new AppError("Some products are no longer available", 400);
      }

      await InventoryService.reserve(products, dbProducts);
      reservedProducts.push(...products);

      const sellers = await Customer.find({
        _id: { $in: Object.keys(ordersBySeller) },
      })
        .select("address")
        .lean();

      const sellerAddressMap = new Map(sellers.map((seller) => [seller._id.toString(), seller.address || ""]));

      let grandTotal = 0;
      const createdOrders = [];

      for (const sellerId in ordersBySeller) {
        const orderItems = ordersBySeller[sellerId];

        const sellerProducts = dbProducts.filter((product) =>
          orderItems.some((item) => item.id.toString() === product._id.toString())
        );

        if (sellerProducts.length !== orderItems.length) {
          throw new AppError("Some products are no longer available", 400);
        }

        // FIX: Tính Subtotal chính xác = Giá tiền (price) * Số lượng khách mua (item.quantity)
        // Code cũ bị lỗi chỉ tính: s + p.price
        const subtotal = sellerProducts.reduce((s, p) => {
          const item = orderItems.find((i) => i.id.toString() === p._id.toString());
          return s + p.price * item.quantity;
        }, 0);
        const { providerId, shippingFee } = await ProviderService.calculateShippingFee(subtotal);

        const total = subtotal + shippingFee;
        grandTotal += total;

        // create order
        const [order] = await measureDB("create", "orders", Order.create(
          [
            {
              ownerId: userId,
              sellerId,
              // FIX: Map đúng quantity của từng món hàng để lưu vào DB Order
              // Code cũ hardcode quantity: 1 cho mọi sản phẩm
              products: sellerProducts.map((p) => {
                const item = orderItems.find((i) => i.id.toString() === p._id.toString());
                return {
                  id: p._id,
                  quantity: item.quantity,
                  priceAtOrder: p.price,
                };
              }),
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
          ]
        ));

        createdOrders.push(order);

        // FIX: Gửi Message cho RabbitMQ với mảng products chứa đủ {id, quantity}
        // Để Worker biết mà trừ kho chính xác
        jobs.push({
          orderId: order._id.toString(),
          userId,
          sellerId,
          subtotal,
          products: orderItems.map((i) => ({ id: i.id.toString(), quantity: i.quantity })),
        });
      }

      // deduct wallet (atomic)
      const wallet = await measureDB("findOneAndUpdate", "wallets", Wallet.findOneAndUpdate(
        { userId, balance: { $gte: grandTotal } },
        { $inc: { balance: -grandTotal } },
        { new: true }
      ));

      if (!wallet) {
        await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
        throw new AppError("Insufficient balance", 400);
      }

      // remove cart
      await measureDB("updateOne", "carts", Cart.updateOne(
        { userId },
        { $pull: { products: { id: { $in: products.map((p) => p.id) } } } }
      ));

      for (const job of jobs) {
        try {
          await RabbitMQService.publish(job);
        } catch (publishError) {
          logger.warn(`[RabbitMQ] publish failed for order ${job.orderId}: ${publishError.message}`);
        }
      }

      return createdOrders;
    } catch (err) {
      if (reservedProducts.length > 0) {
        try {
          await InventoryService.release(reservedProducts);
        } catch (releaseError) {
          logger.warn(`[Inventory] release failed: ${releaseError.message}`);
        }
      }
      if (createdOrders.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
      }
      throw err;
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
