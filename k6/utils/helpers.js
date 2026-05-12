import http from "k6/http";
import { check } from "k6";

export const BASE_URL = __ENV.BASE_URL || "http://localhost/api";

export const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Đăng nhập và trả về cookie jar đã chứa session token.
 * k6 tự động gửi cookie trong mọi request tiếp theo của cùng VU.
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS }
  );

  const ok = check(res, {
    "login: status 200": (r) => r.status === 200,
  });

  if (!ok) return null;

  // Nếu server trả JWT trong body thay vì cookie
  try {
    const body = res.json();
    return body?.data?.token || body?.token || null;
  } catch {
    return null;
  }
}

export function authHeaders(token) {
  if (!token) return { headers: JSON_HEADERS };
  return {
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${token}`,
    },
  };
}

/** Lấy một product ID ngẫu nhiên từ danh sách sản phẩm. */
export function getRandomProductId() {
  const res = http.get(`${BASE_URL}/product/list?limit=20`);
  if (res.status !== 200) return null;
  try {
    const items = res.json()?.data?.products || res.json()?.data || [];
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)]._id;
  } catch {
    return null;
  }
}
