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
