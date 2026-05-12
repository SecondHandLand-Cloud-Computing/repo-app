/**
 * Stress Test — đẩy hệ thống vượt ngưỡng để tìm điểm gãy.
 * Tăng tải liên tục đến khi error rate vượt ngưỡng hoặc latency không chấp nhận được.
 *
 * Stages:
 *   0 → 50 VU   (2 phút)
 *   50 → 100 VU (3 phút)
 *   100 → 200 VU (3 phút)
 *   200 → 300 VU (3 phút)
 *   300 → 0      (2 phút)  cool-down
 *
 * Chạy:
 *   k6 run k6/stress.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate } from "k6/metrics";
import { BASE_URL, JSON_HEADERS, getRandomProductId } from "./utils/helpers.js";

const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "2m",  target: 50  },
    { duration: "3m",  target: 100 },
    { duration: "3m",  target: 200 },
    { duration: "3m",  target: 300 },
    { duration: "2m",  target: 0   },
  ],

  thresholds: {
    // Stress test: nới lỏng threshold để quan sát hành vi hệ thống
    http_req_failed:   ["rate<0.10"],   // chấp nhận tới 10% lỗi
    http_req_duration: ["p(95)<3000"],  // p95 < 3s
    errors:            ["rate<0.10"],
  },
};

export default function () {
  // Mix workload: đọc nhiều hơn ghi (tỉ lệ thực tế)
  const r = Math.random();

  if (r < 0.50) {
    // 50%: list sản phẩm
    group("stress: product list", () => {
      const page = Math.floor(Math.random() * 10) + 1;
      const res = http.get(`${BASE_URL}/product/list?limit=12&page=${page}`);
      const ok = check(res, { "product list 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  } else if (r < 0.75) {
    // 25%: product detail
    group("stress: product detail", () => {
      const productId = getRandomProductId();
      if (!productId) return;
      const res = http.get(`${BASE_URL}/product/${productId}`);
      const ok = check(res, { "product detail 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  } else if (r < 0.90) {
    // 15%: categories
    group("stress: categories", () => {
      const res = http.get(`${BASE_URL}/category/list`);
      const ok = check(res, { "categories 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  } else {
    // 10%: login (write-heavy operation)
    group("stress: login", () => {
      const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: "test@example.com", password: "Test@123" }),
        { headers: JSON_HEADERS }
      );
      const ok = check(res, { "login 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  }

  sleep(0.3); // minimal sleep để tạo áp lực tối đa
}
