import redis from "../config/redis.config.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const STOCK_PREFIX = "inventory:stock:";

const reserveStockScript = `
local insufficient = {}

for i = 1, #KEYS do
  local stock = tonumber(redis.call("GET", KEYS[i]) or "-1")
  local qty = tonumber(ARGV[i])
  if stock < qty then
    table.insert(insufficient, KEYS[i])
  end
end

if #insufficient > 0 then
  return cjson.encode({ ok = false, insufficient = insufficient })
end

for i = 1, #KEYS do
  redis.call("DECRBY", KEYS[i], tonumber(ARGV[i]))
end

return cjson.encode({ ok = true })
`;

const releaseStockScript = `
for i = 1, #KEYS do
  redis.call("INCRBY", KEYS[i], tonumber(ARGV[i]))
end

return cjson.encode({ ok = true })
`;

const toJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const InventoryService = {
  getStockKey(productId) {
    return `${STOCK_PREFIX}${productId}`;
  },

  getProductStock(product) {
    if (typeof product.quantity === "number") return product.quantity;
    return 1;
  },

  async hydrateStockCache(products) {
    await Promise.all(
      products.map(async (product) => {
        const key = this.getStockKey(product._id);
        const stock = this.getProductStock(product);
        await redis.set(key, String(stock), "NX");
      })
    );
  },

  normalizeItems(items) {
    return items.map((item) => ({
      productId: item.id ? item.id.toString() : item._id.toString(),
      quantity: item.quantity || 1,
    }));
  },

  async reserve(orderItems, dbProducts) {
    const items = this.normalizeItems(orderItems);
    if (items.length === 0) return items;

    await this.hydrateStockCache(dbProducts);

    const keys = items.map((item) => this.getStockKey(item.productId));
    const args = items.map((item) => String(item.quantity));
    const result = toJson(await redis.eval(reserveStockScript, keys.length, ...keys, ...args));

    if (!result?.ok) {
      logger.warn("[Inventory] Reserve failed:", result?.insufficient || []);
      throw new AppError("Some products are out of stock", 409);
    }

    return items;
  },

  async release(orderItems) {
    const items = this.normalizeItems(orderItems);
    if (items.length === 0) return;

    const keys = items.map((item) => this.getStockKey(item.productId));
    const args = items.map((item) => String(item.quantity));
    await redis.eval(releaseStockScript, keys.length, ...keys, ...args);
  },
};