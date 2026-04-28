import mongoose from "mongoose";

import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { CloudinaryService } from "./cloudinary.service.js";
import { AppError } from "../utils/AppError.js";
import { RedisService } from "./redis.service.js";
import { measureDB } from "../monitoring/dbMetrics.js";

export const ProductService = {
  async getById(productId, user) {
    // kiem tra redis truoc 
    const cacheKey = `product_detail:${productId}`;
    let product = await RedisService.get(cacheKey);
    // neu redis khong co du lieu -> truy van mongoDB
    if (!product) {
      product = await measureDB("findById", "products", Product.findById(productId)
        .populate("createdBy", "name _id address avatarPublicId")
        .populate("categoryId", "name")
        .lean());
      
      // truy van mongoDB va co du lieu -> luu vao redis
      if (product) {
        await RedisService.set(cacheKey, product, 60)
      }
    }

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (user.role !== "admin") {
      // only admin can view status deleted
      if (product.status === "deleted") {
        throw new AppError("Product not found", 404);
      } // check owner and guest only view active product
      else if (product.createdBy.toString() !== user.id.toString() && product.status !== "active") {
        throw new AppError("Product not found", 404);
      }
    }

    product.imagePublicUrl = CloudinaryService.generateSignedUrl(product.imagePublicId);

    product.createdBy.avatarPublicUrl = CloudinaryService.generateSignedUrl(
      product.createdBy.avatarPublicId
    );

    // reshape category
    product.category = {
      _id: product.categoryId._id,
      name: product.categoryId.name,
    };

    delete product.categoryId; // remove old field

    return product;
  },

  async create(user, categoryId, name, description, price, image) {
    if (user.role === "admin") throw new AppError("Only customer can create product", 400);

    const uploadResult = await CloudinaryService.uploadFile(image, "images");

    const product = await Product.create({
      createdBy: user.id,
      categoryId: categoryId,
      name: name,
      description: description,
      price: price,
      imagePublicId: uploadResult.public_id,
    });

    return product;
  },

  async update(user, productId, payload, image = null) {
    const product = await Product.findById(productId).lean();

    if (!product) {
      throw new AppError("Product not found", 404);
    }
    if (product.createdBy.toString() !== user.id.toString() && user.role !== "admin") {
      throw new AppError("Access denied", 403);
    }

    let updateData = {};

    if (payload.categoryId) updateData.categoryId = payload.categoryId;

    if (payload.name) updateData.name = payload.name;

    if (payload.description) updateData.description = payload.description;

    if (payload.price !== undefined) updateData.price = Number(payload.price);

    // update alway set status pending
    updateData.status = "pending";
    if (payload.status && user.role === "admin") {
      updateData.status = payload.status;
    }
    if (image) {
      const uploadResult = await CloudinaryService.uploadFile(image, "avatars");
      if (product.imagePublicId) {
        await CloudinaryService.deleteFile(product.imagePublicId);
      }
      updateData.imagePublicId = uploadResult.public_id;
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    // remove product all cart if product not active
    if (updatedProduct.status !== "active") {
      await Cart.updateMany(
        { "products.id": updatedProduct._id },
        { $pull: { products: { id: updatedProduct._id } } }
      );
    }

    // bỏ cache cũ trong redis vì dữ liệu đã bị sửa đổi
    await RedisService.del(`product_detail:${productId}`);

    return {
      ...updatedProduct,
      imagePublicUrl: CloudinaryService.generateSignedUrl(updatedProduct.imagePublicId),
    };
  },

  async delete(productId) {
    const product = await Product.findByIdAndDelete(productId);

    await CloudinaryService.deleteFile(product.imagePublicId);

    // remove product all cart
    await Cart.updateMany({ "products.id": productId }, { $pull: { products: { productId } } });

    // remove cache old in redis
    await RedisService.del(`product_detail:${productId}`);
  },

  async getList(user, page, limit, search, categoryId) {
    // tạo cache key động để phân biệt
    const cacheKey = `product_list:role_${user?.role}:u_${user?.id}:p_${page}:l_${limit}:s_${search || ''}:c_${categoryId || ''}`;
    const cacheData = await RedisService.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }

    // neu khong co cache -> truy van mongoDB va luu vao redis
    const skip = (page - 1) * limit;
    const filter = {};
    
    // admin can view all status
    if (user.role !== "admin") {
      filter.status = "active";
    }
    // exclude own products
    if (user.id) {
      filter.createdBy = { $ne: new mongoose.Types.ObjectId(user.id) };
    }
    if (search) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }
    if (categoryId) {
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const [items, total] = await Promise.all([
      measureDB("find", "products", Product.find(filter)
        .populate("createdBy", "name _id address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()),
      
      measureDB("countDocuments", "products", Product.countDocuments(filter)),
    ]);

    // attach url
    const data = items.map((product) => {
      return {
        ...product,
        imagePublicUrl: CloudinaryService.generateSignedUrl(product.imagePublicId),
        category: {
          _id: product.categoryId._id,
          name: product.categoryId.name,
        },
      };
    });

    const finalResult = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // luu vao redis
    await RedisService.set(cacheKey, finalResult, 60);

    return finalResult;
  },

  async getMyList(userId) {
    // tao cache key
    const cacheKey = `my_product_list:${userId}`;
    // kiem tra redis 
    const cacheData = await RedisService.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }

    // neu khong co cache -> truy van mongoDB va luu vao redis
    const products = await Product.find({
      createdBy: new mongoose.Types.ObjectId(userId),
      status: { $ne: "deleted" },
    })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const finalResult = products.map((product) => ({
      ...product,
      imagePublicUrl: CloudinaryService.generateSignedUrl(product.imagePublicId),
      category: {
        _id: product.categoryId._id,
        name: product.categoryId.name,
      },
    }))

    // luu vao redis
    await RedisService.set(cacheKey, finalResult, 15);

    return finalResult
  },
};
