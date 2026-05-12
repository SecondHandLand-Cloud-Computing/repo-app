/**
 * Soak Test — chạy load vừa phải trong thời gian dài để phát hiện:
 *   - Memory leak
 *   - Connection pool cạn kiệt
 *   - Degradation theo thời gian
 *
 * Load: 20 VU trong 30 phút
 *
 * Chạy:
 *   k6 run k6/soak.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, JSON_HEADERS, getRandomProductId } from "./utils/helpers.js";

// Trend theo thời gian để phát hiện degradation
const latencyTrend = new Trend("latency_over_time_ms", true);
const errorRate    = new Rate("errors");

export const options = {
  stages: [
    { duration: "2m",  target: 20 },  // warm-up
    { duration: "26m", target: 20 },  // soak
    { duration: "2m",  target: 0  },  // cool-down
  ],

  thresholds: {
    http_req_failed:        ["rate<0.01"],
    http_req_duration:      ["p(95)<1000"],
    // Phát hiện degradation: p99 không được vượt 3s
    "http_req_duration{type:read}": ["p(99)<3000"],
    errors:                 ["rate<0.01"],
  },
};

const TEST_EMAIL    = __ENV.TEST_EMAIL    || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "Test@123";

export default function () {
  const r = Math.random();

  if (r < 0.40) {
    group("soak: product list", () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/product/list?limit=12`, {
        tags: { type: "read" },
      });
      latencyTrend.add(Date.now() - start);
      const ok = check(res, { "product list 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  } else if (r < 0.65) {
    group("soak: product detail", () => {
      const productId = getRandomProductId();
      if (!productId) return;
      const start = Date.now();
      const res = http.get(`${BASE_URL}/product/${productId}`, {
        tags: { type: "read" },
      });
      latencyTrend.add(Date.now() - start);
      const ok = check(res, { "product detail 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  } else if (r < 0.80) {
    group("soak: categories", () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/category/list`, { tags: { type: "read" } });
      latencyTrend.add(Date.now() - start);
      const ok = check(res, { "categories 200": (r) => r.status === 200 });
      errorRate.add(!ok);
    });
  } else {
    group("soak: auth flow", () => {
      const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
        { headers: JSON_HEADERS, tags: { type: "write" } }
      );
      const ok = check(res, { "login 200": (r) => r.status === 200 });
      errorRate.add(!ok);
      if (ok) {
        sleep(0.5);
        try {
          const token = res.json()?.data?.token || res.json()?.token;
          if (token) {
            http.post(`${BASE_URL}/auth/logout`, null, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch {}
      }
    });
  }

  sleep(1);
}
