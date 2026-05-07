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
        select: "name description price imagePublicId createdBy quantity status",
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
        quantity: item.quantity,
        stock: product.quantity,
        imagePublicId: product.imagePublicId,
        imagePublicUrl: CloudinaryService.generateSignedUrl(product.imagePublicId),
        seller: {
          _id: product.createdBy._id,
          name: product.createdBy.name,
          address: product.createdBy.address,
        },
      };
    });

    const totalProducts = products.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);

    return {
      _id: cart._id,
      userId: cart.userId,
      products,
      totalProducts,
      totalPrice,
    };
  },

  async addToCart(userId, productId, quantity = 1) {
    const product = await Product.findById(productId).lean();
    if (!product || product.status !== "active") throw new AppError("Product not found", 404);

    if (quantity > product.quantity) throw new AppError(`Only ${product.quantity} item(s) in stock`, 400);

    if (userId.toString() === product.createdBy.toString()) {
      throw new AppError("Cannot add your own product", 400);
    }

    const cart = await Cart.findOne({ userId: userId });
    const existingProductIndex = cart.products.findIndex((item) => item.id.toString() === productId.toString());
    
    if (existingProductIndex > -1) {
      const newQuantity = cart.products[existingProductIndex].quantity + quantity;
      if (newQuantity > product.quantity) throw new AppError(`Only ${product.quantity} item(s) in stock`, 400);
      cart.products[existingProductIndex].quantity = newQuantity;
    } else {
      cart.products.push({ id: productId, quantity });
    }
    
    await cart.save();
    return cart;
  },

  async remove(userId, productId, quantityToRemove = 1) {
    const cart = await Cart.findOne({ userId: userId });
    const productIndex = cart.products.findIndex((item) => item.id.toString() === productId.toString());
    
    if (productIndex === -1) {
      throw new AppError("Product not in cart", 404);
    }

    if (quantityToRemove >= cart.products[productIndex].quantity) {
      cart.products.splice(productIndex, 1);
    } else {
      cart.products[productIndex].quantity -= quantityToRemove;
    }

    await cart.save();
    return cart;
  },

  async updateQuantity(userId, productId, quantity) {
    const product = await measureDB("findById", "products", Product.findById(productId).lean());
    if (!product || product.status !== "active") throw new AppError("Product not found", 404);

    if (quantity > product.quantity) throw new AppError(`Only ${product.quantity} item(s) in stock`, 400);

    const cart = await Cart.findOne({ userId: userId });
    const productIndex = cart.products.findIndex((item) => item.id.toString() === productId.toString());
    
    if (productIndex === -1) {
      throw new AppError("Product not in cart", 404);
    }

    cart.products[productIndex].quantity = quantity;
    
    await cart.save();
    return cart;
  },
};
