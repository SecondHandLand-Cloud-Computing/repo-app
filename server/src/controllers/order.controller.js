import { asyncHandler } from "../utils/asyncHandler.js";
import { OrderService } from "../services/order.service.js";
import { successCheckoutTotal } from "../monitoring/businessMetrics.js"; // Import metric

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  // products is array:
  // [{id: ..., createdBy: ..., price: ..., address:...},...] (address of createdBy)
  const { products, pickupAddress } = req.body;

  const result = await OrderService.create(userId, products, pickupAddress);

  successCheckoutTotal.inc();

  return res.status(200).json({
    message: "Create order successfully",
    data: result,
  });
});

export const getListOrders = asyncHandler(async (req, res) => {
  const user = {
    id: req.user?.sub,
    role: req.user?.role,
  };
  const { page = 1, limit = 10, status } = req.query;
  const result = await OrderService.getList(user, page, limit, status);

  return res.status(200).json({
    message: "Get list orders successfully",
    data: result,
  });
});
