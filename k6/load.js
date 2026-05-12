/**
 * Load Test — mô phỏng traffic bình thường với 2 luồng người dùng song song.
 *
 *   browse_flow   (70%): khách vãng lai — duyệt sản phẩm, xem chi tiết
 *   shopping_flow (30%): người mua — đăng nhập → thêm giỏ hàng → đặt hàng
 *
 * Stages:
 *   0 → 20 VU  (1 phút)   ramp-up
 *   20 VU      (5 phút)   steady load
 *   20 → 50 VU (2 phút)   tăng tải
 *   50 VU      (5 phút)   peak load
 *   50 → 0     (1 phút)   ramp-down
 *
 * Chạy:
 *   k6 run k6/load.js
 *   k6 run --out influxdb=http://localhost:8086/k6 k6/load.js  # gửi vào Grafana
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";
import { BASE_URL, JSON_HEADERS, login, getRandomProductId } from "./utils/helpers.js";

// Custom metrics
const loginErrors    = new Rate("login_errors");
const cartErrors     = new Rate("cart_errors");
const orderErrors    = new Rate("order_errors");
const checkoutTime   = new Trend("checkout_duration_ms", true);

export const options = {
  scenarios: {
    browse_flow: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages: [
        { duration: "1m",  target: 14 },
        { duration: "5m",  target: 14 },
        { duration: "2m",  target: 35 },
        { duration: "5m",  target: 35 },
        { duration: "1m",  target: 0  },
      ],
      exec: "browseFlow",
    },
    shopping_flow: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages: [
        { duration: "1m",  target: 6  },
        { duration: "5m",  target: 6  },
        { duration: "2m",  target: 15 },
        { duration: "5m",  target: 15 },
        { duration: "1m",  target: 0  },
      ],
      exec: "shoppingFlow",
    },
  },

  thresholds: {
    http_req_failed:                    ["rate<0.01"],
    http_req_duration:                  ["p(95)<1000", "p(99)<2000"],
    "http_req_duration{type:read}":     ["p(95)<500"],
    "http_req_duration{type:write}":    ["p(95)<1000"],
    login_errors:                       ["rate<0.05"],
    cart_errors:                        ["rate<0.05"],
    order_errors:                       ["rate<0.10"],
    checkout_duration_ms:               ["p(95)<2000"],
  },
};

const TEST_EMAIL    = __ENV.TEST_EMAIL    || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "Test@123";

// ── Flow 1: Khách vãng lai duyệt sản phẩm ────────────────────────────────────
export function browseFlow() {
  group("browse: product list", () => {
    const page = Math.floor(Math.random() * 5) + 1;
    const res = http.get(`${BASE_URL}/product/list?limit=12&page=${page}`, {
      tags: { type: "read" },
    });
    check(res, {
      "product list 200": (r) => r.status === 200,
      "product list has data": (r) => Array.isArray(r.json()?.data?.products || r.json()?.data),
    });
  });

  sleep(randomBetween(0.5, 1.5));

  group("browse: product detail", () => {
    const productId = getRandomProductId();
    if (!productId) return;
    const res = http.get(`${BASE_URL}/product/${productId}`, {
      tags: { type: "read" },
    });
    check(res, { "product detail 200": (r) => r.status === 200 });
  });

  sleep(randomBetween(1, 3));

  group("browse: categories", () => {
    const res = http.get(`${BASE_URL}/category/list`, { tags: { type: "read" } });
    check(res, { "categories 200": (r) => r.status === 200 });
  });

  sleep(randomBetween(1, 2));
}

// ── Flow 2: Người dùng đăng nhập và mua hàng ─────────────────────────────────
export function shoppingFlow() {
  let token = null;

  group("auth: login", () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      { headers: JSON_HEADERS, tags: { type: "write" } }
    );
    const ok = check(res, { "login 200": (r) => r.status === 200 });
    loginErrors.add(!ok);
    if (ok) {
      try { token = res.json()?.data?.token || res.json()?.token; } catch {}
    }
  });

  if (!token) { sleep(2); return; }

  const authOpts = {
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` },
    tags: { type: "read" },
  };

  sleep(randomBetween(0.5, 1));

  // Duyệt sản phẩm sau khi đăng nhập
  let productId = null;
  group("shop: browse products", () => {
    const res = http.get(`${BASE_URL}/product/list?limit=12`, authOpts);
    check(res, { "browse after login 200": (r) => r.status === 200 });
    try {
      const items = res.json()?.data?.products || res.json()?.data || [];
      if (items.length) productId = items[Math.floor(Math.random() * items.length)]._id;
    } catch {}
  });

  sleep(randomBetween(1, 2));

  // Thêm vào giỏ hàng
  if (productId) {
    group("shop: add to cart", () => {
      const res = http.put(
        `${BASE_URL}/cart/${productId}`,
        JSON.stringify({ quantity: 1 }),
        { headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` }, tags: { type: "write" } }
      );
      const ok = check(res, { "add to cart 200": (r) => r.status === 200 });
      cartErrors.add(!ok);
    });

    sleep(randomBetween(0.5, 1.5));

    group("shop: view cart", () => {
      const res = http.get(`${BASE_URL}/cart/me`, authOpts);
      check(res, { "view cart 200": (r) => r.status === 200 });
    });

    sleep(randomBetween(1, 3));

    // Đặt hàng
    group("shop: create order", () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/order`,
        JSON.stringify({ productId, quantity: 1 }),
        { headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` }, tags: { type: "write" } }
      );
      checkoutTime.add(Date.now() - start);
      const ok = check(res, { "create order 2xx": (r) => r.status >= 200 && r.status < 300 });
      orderErrors.add(!ok);
    });
  }

  group("auth: logout", () => {
    http.post(`${BASE_URL}/auth/logout`, null, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { type: "write" },
    });
  });

  sleep(randomBetween(1, 2));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
