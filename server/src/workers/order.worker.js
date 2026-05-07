import { RabbitMQService } from "../services/rabbitmq.service.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Wallet } from "../models/wallet.model.js";
import { Cart } from "../models/cart.model.js";
import { logger } from "../utils/logger.js";

const processOrderJob = async (job) => {
  try {
    const claimedOrder = await Order.findOneAndUpdate(
      { _id: job.orderId, status: "created" },
      { $set: { status: "processing" } },
      { new: true }
    );

    if (!claimedOrder) {
      return;
    }

    await Product.updateMany(
      { _id: { $in: job.productIds } },
      { $set: { status: "sold", stock: 0 } },
      {}
    );

    await Wallet.findOneAndUpdate(
      { userId: job.sellerId },
      { $inc: { balance: job.subtotal } },
      { upsert: true }
    );

    await Cart.updateOne(
      { userId: job.userId },
      { $pull: { products: { id: { $in: job.productIds } } } },
      {}
    );

    await Order.findByIdAndUpdate(job.orderId, { status: "confirmed" });
    logger.info(`[RabbitMQ] processed order job ${job.orderId}`);
  } catch (err) {
    logger.error(`[RabbitMQ] process order job failed: ${err.message}`);
    throw err;
  }
};

export const startOrderWorker = async () => {
  try {
    await RabbitMQService.connect();
    await RabbitMQService.consume(processOrderJob);
    logger.info("[RabbitMQ] order worker started");
  } catch (err) {
    logger.warn(`[RabbitMQ] worker unavailable, retrying: ${err.message}`);
    setTimeout(() => {
      startOrderWorker().catch((retryErr) => {
        logger.error(`[RabbitMQ] worker retry failed: ${retryErr.message}`);
      });
    }, 5000);
  }
};