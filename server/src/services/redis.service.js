import redis from "../config/redis.config.js";
import { redisCacheHits, redisCacheMisses } from "../monitoring/dbMetrics.js";

export const RedisService = {
  async set(key, value, ttl = null) {
    if (ttl) {
      return redis.set(key, JSON.stringify(value), "EX", ttl);
    }
    return redis.set(key, JSON.stringify(value));
  },

  async get(key) {
    const value = await redis.get(key); // value != null tức dữ liệu đã có trong redis
    
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
  },

  async del(key) {
    return redis.del(key);
  },

  async incr(key) {
    return redis.incr(key);
  },

  async expire(key, seconds) {
    return redis.expire(key, seconds);
  },
};
