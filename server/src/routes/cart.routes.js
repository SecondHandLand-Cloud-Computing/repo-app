import { Router } from "express";
import { getCart, addToCart, removeFromCart, updateCartQuantity } from "../controllers/cart.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const router = Router();

router.use(requireAuth);

router.get("/me", getCart);

router.put("/:id", addToCart); // add product, body: { quantity }

router.patch("/:id/quantity", updateCartQuantity); // update quantity in cart

router.delete("/:id", removeFromCart);
