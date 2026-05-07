import axios from "axios";

const axiosClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// =======================
// AUTH API
// =======================
export const authApi = {
  login: (mail, password) => axiosClient.post("/auth/login", { mail, password }),
  sendOtp: (type, data) => axiosClient.post(`/auth/send-otp?type=${type}`, data),
  verifyOtp: (type, token, otp) =>
    axiosClient.post(`/auth/verify-otp?type=${type}&token=${token}`, { otp }),
  register: (token) => axiosClient.post(`/auth/register?token=${token}`, {}),
  forgotPassword: (mail, newPassword) =>
    axiosClient.post("/auth/forgot-password", { mail, newPassword }),
  changePassword: (oldPassword, newPassword) =>
    axiosClient.post("/auth/change-password", { oldPassword, newPassword }),
  logout: () => axiosClient.post("/auth/logout"),
};

// =======================
// PRODUCT API
// =======================
export const productApi = {
  // Danh sách sản phẩm public
  getList: (page = 1, limit = 6, params = {}) =>
    axiosClient.get("/product/list", { params: { page, limit, ...params } }),

  // Danh sách sản phẩm của user hiện tại (my listing)
  getMyList: (params = {}) => axiosClient.get("/product/my-list", { params }),

  // Chi tiết sản phẩm
  getById: (id) =>
    axiosClient.get(`/product/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }),

  // Thêm sản phẩm (cần formData để upload ảnh)
  create: (formData) => axiosClient.post("/product", formData),

  // Cập nhật sản phẩm
  update: (id, formData) => axiosClient.put(`/product/${id}`, formData),

  // Xoá sản phẩm
  delete: (id) => axiosClient.delete(`/product/${id}`),
};

// =======================
// REVIEW API
// =======================
export const reviewApi = {
  getByUserId: (userId) => axiosClient.get(`/review/list/${userId}`),
  create: (data) => axiosClient.post("/review", data),
};

// =======================
// USER / SHOP API
// =======================
export const customerApi = {
  getMe: () => axiosClient.get("/customer/me"),
  getById: (id) => axiosClient.get(`/customer/${id}`),
};

// =======================
// CART API
// =======================
export const cartApi = {
  getCart: () => axiosClient.get("/cart/me"),
  addToCart: (productId, quantity = 1) =>
    axiosClient.put(`/cart/${productId}`, { quantity }),
  updateQuantity: (productId, quantity) =>
    axiosClient.patch(`/cart/${productId}/quantity`, { quantity }),
  removeOne: (productId) => axiosClient.delete(`/cart/${productId}`),
};

// =======================
// CATEGORY API
// =======================
export const categoryApi = {
  getListCategories: () => axiosClient.get("/category/list"),
  getTopSellingCategories: () => axiosClient.get("/category/top-selling"),
};

// =======================
// ORDER API
// =======================
export const orderApi = {
  createOrder: (data) => axiosClient.post("/order", data),
  getOrderHistory: () => axiosClient.get("/order/order-history"),
  getOrderList: () => axiosClient.get("/order/list"),
};

export default axiosClient;
