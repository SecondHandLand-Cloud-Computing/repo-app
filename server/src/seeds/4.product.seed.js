import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import { Customer } from "../models/customer.model.js";

import seedProducts from "./data/product.json" with { type: "json" };
import { logger } from "../utils/logger.js";

const getQuantity = (status, providedQty) => {
  if (providedQty !== undefined) return providedQty;
  if (status === "active" || status === "sold") {
    if (status === "sold" && Math.random() < 0.25) {
      return 0;
    }

    const rand = Math.random();
    if (rand < 0.1) return 1;
    if (rand < 0.4) return Math.floor(Math.random() * 9) + 2;
    if (rand < 0.8) return Math.floor(Math.random() * 40) + 10;
    return Math.floor(Math.random() * 150) + 50;
  }
  return 0;
};

const mapStatus = (status) => (status === "sold" ? "active" : status);

export const seed = async () => {
  try {
    await Product.deleteMany();

    for (const product of seedProducts) {
      const category = await Category.findOne({ name: product.categoryName }).lean();
      if (!category) {
        logger.error(`[SEED] Category ${product.categoryName} not found`);
        continue;
      }
      const customer = await Customer.findOne({ mail: product.createdBy }).lean();
      if (!customer) {
        logger.error(`[SEED] Customer ${product.createdBy} not found`);
        continue;
      }

      await Product.create({
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: getQuantity(product.status, product.quantity),
        stock: product.status === "sold" ? 0 : 1,
        imagePublicId: product.imagePublicId,
        status: mapStatus(product.status),
        createdBy: customer._id,
        categoryId: category._id,
      });
    }
  } catch (error) {
    console.error("[SEED] Error:", error);
    logger.error("[SEED] Error", error);
  }
};

