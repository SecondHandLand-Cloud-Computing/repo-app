import redis from "../config/redis.config.js";
import { redisCacheHits, redisCacheMisses } from "../monitoring/dbMetrics.js";
import { logger } from "../utils/logger.js";

export const RedisService = {
  async set(key, value, ttl = null) {
    try {
      if (ttl) {
        await redis.setex(key, ttl, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (err) {
      logger.warn(`[Redis] Cache write failed for key "${key}": ${err.message}`);
      // App continues working, just without cache
    }
  },

  async get(key) {
    try {
      const value = await redis.get(key);

      if (value) {
        redisCacheHits.inc();
      } else {
        redisCacheMisses.inc();
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (err) {
      logger.warn(`[Redis] Cache read failed for key "${key}": ${err.message}`);
      return null; // Cache miss fallback
    }
  },

  async del(key) {
    try {
      return await redis.del(key);
    } catch (err) {
      logger.warn(`[Redis] Cache delete failed for key "${key}": ${err.message}`);
    }
  },

  async incr(key) {
    try {
      return await redis.incr(key);
    } catch (err) {
      logger.warn(`[Redis] incr failed for key "${key}": ${err.message}`);
      return null;
    }
  },

  async expire(key, seconds) {
    try {
      return await redis.expire(key, seconds);
    } catch (err) {
      logger.warn(`[Redis] expire failed for key "${key}": ${err.message}`);
    }
  },
};
