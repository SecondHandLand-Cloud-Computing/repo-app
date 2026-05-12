/**
 * Smoke Test — kiểm tra hệ thống hoạt động cơ bản trước khi chạy load test.
 * 1 VU, 1 phút. Nếu smoke test fail → không cần chạy các test nặng hơn.
 *
 * Chạy:
 *   k6 run k6/smoke.js
 *   k6 run --env BASE_URL=http://your-lb-ip/api k6/smoke.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, JSON_HEADERS, login } from "./utils/helpers.js";

export const options = {
  vus: 1,
  duration: "1m",

  thresholds: {
    http_req_failed:          ["rate<0.01"],   // < 1% lỗi
    http_req_duration:        ["p(95)<500"],   // 95% requests < 500ms
    "http_req_duration{type:read}":  ["p(95)<400"],
    "http_req_duration{type:write}": ["p(95)<800"],
  },
};

const TEST_EMAIL    = __ENV.TEST_EMAIL    || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "Test@123";

export default function () {
  // ── 1. Health check ──────────────────────────────────────────────────────
  let res = http.get(`http://localhost/health`, { tags: { type: "read" } });
  check(res, { "health: status 200": (r) => r.status === 200 });

  // ── 2. Danh sách sản phẩm (public) ───────────────────────────────────────
  res = http.get(`${BASE_URL}/product/list?limit=10&page=1`, {
    tags: { type: "read" },
  });
  check(res, {
    "product list: status 200": (r) => r.status === 200,
    "product list: có data":    (r) => r.json()?.data !== undefined,
  });

  // ── 3. Danh sách category (public) ───────────────────────────────────────
  res = http.get(`${BASE_URL}/category/list`, { tags: { type: "read" } });
  check(res, { "category list: status 200": (r) => r.status === 200 });

  // ── 4. Top-selling categories ────────────────────────────────────────────
  res = http.get(`${BASE_URL}/category/top-selling`, { tags: { type: "read" } });
  check(res, { "top-selling: status 200": (r) => r.status === 200 });

  // ── 5. Login ──────────────────────────────────────────────────────────────
  res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: JSON_HEADERS, tags: { type: "write" } }
  );
  check(res, { "login: status 200": (r) => r.status === 200 });

  sleep(1);
}
