import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";

import { CloudinaryService } from "./cloudinary.service.js";
import { AppError } from "../utils/AppError.js";
import { measureDB } from "../monitoring/dbMetrics.js";

export const CartService = {
  async create(userId) {
    const cart = await Cart.create({ userId: userId });
    return cart;
  },

  async getByUserId(userId) {
    const cart = await measureDB("findOne", "carts", Cart.findOne({ userId })
      .populate({
        path: "products.id",
        select: "name description price imagePublicId createdBy",
        populate: {
          path: "createdBy",
          select: "name address",
        },
      })
      .lean());

    const products = cart.products.map((item) => {
      const product = item.id;

      return {
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        imagePublicId: product.imagePublicId,
        imagePublicUrl: CloudinaryService.generateSignedUrl(product.imagePublicId),
        seller: {
          _id: product.createdBy._id,
          name: product.createdBy.name,
          address: product.createdBy.address,
        },
      };
    });

    const totalProducts = products.length;
    const totalPrice = products.reduce((sum, product) => sum + product.price, 0);

    return {
      _id: cart._id,
      userId: cart.userId,
      products,
      totalProducts,
      totalPrice,
    };
  },

  async addToCart(userId, productId) {
    const product = await Product.findById(productId).lean();
    if (!product || product.status !== "active") throw new AppError("Product not found", 404);

    // Check owner product
    if (userId.toString() === product.createdBy.toString()) {
      throw new AppError("Cannot add your own product", 400);
    }

    const cart = await measureDB("findOne", "carts", Cart.findOne({ userId: userId }));
    // Check prod in cart
    const p = cart.products.some((item) => item.id.toString() === productId.toString());
    if (p) {
      throw new AppError("Product already in cart", 400);
    }

    cart.products.push({ id: productId });
    await cart.save();
    return cart;
  },

  async remove(userId, productId) {
    const cart = await measureDB("findOne", "carts", Cart.findOne({ userId: userId }));
    // Check product in cart
    const p = cart.products.some((item) => item.id._id.toString() === productId.toString());
    if (!p) {
      throw new AppError("Product not in cart", 404);
    }

    // Remove product
    cart.products = cart.products.filter((item) => item.id._id.toString() !== productId.toString());

    await cart.save();
    return cart;
  },
};
