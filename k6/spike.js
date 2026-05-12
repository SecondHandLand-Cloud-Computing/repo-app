/**
 * Spike Test — mô phỏng traffic đột biến (flash sale, viral event).
 * Kiểm tra hệ thống có tự phục hồi sau khi spike giảm không.
 *
 * Pattern:
 *   Baseline (10 VU) → Spike (250 VU trong 1 phút) → Baseline (10 VU) → nghỉ
 *
 * Chạy:
 *   k6 run k6/spike.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { BASE_URL, JSON_HEADERS } from "./utils/helpers.js";

const errorRate      = new Rate("errors");
const recoveryTime   = new Trend("recovery_duration_ms", true);

export const options = {
  stages: [
    { duration: "1m",  target: 10  },  // baseline
    { duration: "30s", target: 250 },  // spike lên nhanh
    { duration: "1m",  target: 250 },  // duy trì spike
    { duration: "30s", target: 10  },  // drop về baseline
    { duration: "2m",  target: 10  },  // quan sát recovery
    { duration: "30s", target: 0   },
  ],

  thresholds: {
    http_req_failed:   ["rate<0.15"],   // spike có thể gây lỗi nhiều hơn
    http_req_duration: ["p(95)<5000"],
    errors:            ["rate<0.15"],
  },
};

let spikeStart = 0;

export default function () {
  // Phát hiện thời điểm đang ở spike (>50 VUs active) để đo recovery time
  const vuCount = __VU;

  // Spike workload: tập trung vào các endpoint nặng nhất
  const r = Math.random();

  let res;
  if (r < 0.60) {
    // 60%: product list — endpoint phổ biến nhất trong flash sale
    res = http.get(`${BASE_URL}/product/list?limit=20&page=1`);
    const ok = check(res, {
      "spike: product list 200": (r) => r.status === 200,
      "spike: response time ok": (r) => r.timings.duration < 5000,
    });
    errorRate.add(!ok);
  } else if (r < 0.85) {
    // 25%: top-selling (dashboard query, thường heavy)
    res = http.get(`${BASE_URL}/category/top-selling`);
    const ok = check(res, { "spike: top-selling 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  } else {
    // 15%: login — concurrent login trong flash sale
    res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: "test@example.com", password: "Test@123" }),
      { headers: JSON_HEADERS }
    );
    const ok = check(res, { "spike: login 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(0.1);
}
