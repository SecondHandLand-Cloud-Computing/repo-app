import client from "prom-client";
import { register } from "./metrics.js";

/**
 * Số đơn hàng thanh toán thành công.
 * Trả lời câu hỏi: "Khách hàng bấm nút Mua hàng thành công được bao nhiêu lần?"
 */
export const successCheckoutTotal = new client.Counter({
  name: "business_success_checkout_total",
  help: "Total number of successful checkouts",
  registers: [register],
});

/**
 * Số đơn hàng thanh toán thất bại.
 * Trả lời câu hỏi: "Tỷ lệ lỗi khi đặt hàng là bao nhiêu?"
 * Error rate = failedCheckoutTotal / (successCheckoutTotal + failedCheckoutTotal)
 */
export const failedCheckoutTotal = new client.Counter({
  name: "business_failed_checkout_total",
  help: "Total failed checkout attempts",
  registers: [register],
});

/**
 * Thời gian xử lý mỗi lần checkout (histogram).
 * Trả lời câu hỏi: "P50/P95/P99 latency của luồng đặt hàng là bao nhiêu?"
 */
export const checkoutDurationSeconds = new client.Histogram({
  name: "business_checkout_duration_seconds",
  help: "Latency of checkout operations in seconds",
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

