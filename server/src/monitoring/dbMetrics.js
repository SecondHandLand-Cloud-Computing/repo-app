import client from "prom-client";
import { register } from "./metrics.js";

/**
 * Số lượng cache hits / misses của Redis
 */
export const redisCacheHits = new client.Counter({
  name: "redis_cache_hits_total", // Tên metric sẽ hiện trên Grafana
  help: "Total number of Redis cache hits", // Mô tả cho dễ nhớ
  registers: [register], // "Đăng ký" metric này vào kho chứa chung
});

export const redisCacheMisses = new client.Counter({
  name: "redis_cache_misses_total",
  help: "Total number of Redis cache misses",
  registers: [register],
});

/**
 * Số lần yêu cầu lock thất bại (Race condition)
 * Trả lời câu hỏi: "Có bị kẹt xe (Lock) khi 2 người mua cùng lúc không?"
 */
export const lockFailuresTotal = new client.Counter({
  name: "lock_failures_total",
  help: "Total number of lock failures",
  registers: [register],
});

/**
 * Thời gian truy vấn DB (Slow Queries)
 * Trả lời câu hỏi: "Máy chủ tốn bao nhiêu milli-giây để móc dữ liệu ra?
 */
export const dbQueryDurationSeconds = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query_type", "collection"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1], // Thêm bucket 0.1 (100ms) để theo dõi slow query
  registers: [register],
});
