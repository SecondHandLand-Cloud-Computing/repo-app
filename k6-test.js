import http from "k6/http";
import { sleep, check } from "k6";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = "http://cloud-app-alb-837970011.ap-southeast-1.elb.amazonaws.com";

export const options = {
  stages: [
    { duration: "30s", target: 5 },   // ramp up
    { duration: "1m",  target: 10 },  // sustained load
    { duration: "30s", target: 0 },   // ramp down
  ],
};

// Lấy token 1 lần khi khởi động
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ mail: "thu@example.com", password: "222222" }),
    { headers: { "Content-Type": "application/json" } }
  );
  const token = res.json("token");
  return { token };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.token}`,
  };

  // 1. Browse products
  const listRes = http.get(`${BASE_URL}/api/product/list`, { headers });
  check(listRes, { "product list 200": (r) => r.status === 200 });

  // 2. View a specific product
  const products = listRes.json("data.data");
  if (products && products.length > 0) {
    const product = randomItem(products);
    const detailRes = http.get(`${BASE_URL}/api/product/${product._id}`, { headers });
    check(detailRes, { "product detail 200": (r) => r.status === 200 });

    // 3. Create order (checkout) — triggers business metrics
    const orderRes = http.post(
      `${BASE_URL}/api/order`,
      JSON.stringify({
        products: [{ id: product._id, createdBy: product.createdBy._id, price: product.price, address: product.createdBy.address }],
        pickupAddress: "123 Test Street",
      }),
      { headers }
    );
    check(orderRes, { "order created": (r) => r.status === 200 || r.status === 201 });
  }

  sleep(1);
}
