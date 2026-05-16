import mongoose from "mongoose";

import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { CloudinaryService } from "./cloudinary.service.js";
import { AppError } from "../utils/AppError.js";
import { RedisService } from "./redis.service.js";
import { measureDB } from "../monitoring/dbMetrics.js";

export const ProductService = {
  async getById(productId, user) {
    let currentVersion = await RedisService.get(`product_version:${productId}`);
    if (!currentVersion) {
      currentVersion = 1;
    }
    // kiem tra redis truoc 
    const cacheKey = `product_detail:${productId}:v${currentVersion}`;
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

    const userRole = user?.role || "guest";
    const userId = user?.id || null;

    if (userRole !== "admin") {
      // Chỉ admin mới được xem sản phẩm đã xóa
      if (product.status === "deleted") {
        throw new AppError("Product not found", 404);
      }

      // Nếu là khách hoặc không phải chủ sở hữu, chỉ được xem sản phẩm "active"
      const isOwner = userId && product.createdBy && product.createdBy._id.toString() === userId.toString();
      if (!isOwner && product.status !== "active") {
        throw new AppError("Product not found", 404);
      }
    }

    product.imagePublicUrl = CloudinaryService.generateSignedUrl(product.imagePublicId);

    if (product.createdBy) {
      product.createdBy.avatarPublicUrl = CloudinaryService.generateSignedUrl(
        product.createdBy.avatarPublicId
      );
    }

    // reshape category
    product.category = {
      _id: product.categoryId._id,
      name: product.categoryId.name,
    };

    delete product.categoryId; // remove old field

    return product;
  },

  async create(user, categoryId, name, description, price, quantity, image) {
    if (user.role === "admin") throw new AppError("Only customer can create product", 400);

    const uploadResult = await CloudinaryService.uploadFile(image, "images");

    const product = await Product.create({
      createdBy: user.id,
      categoryId: categoryId,
      name: name,
      description: description,
      price: price,
      quantity: quantity ?? 0,
      imagePublicId: uploadResult.public_id,
    });

    return product;
  },

  async update(user, productId, payload, image = null) {
    const product = await measureDB("findById", "products", Product.findById(productId).lean());

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

    if (payload.quantity !== undefined) updateData.quantity = Number(payload.quantity);

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
    const updatedProduct = await measureDB("findOneAndUpdate", "products", Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).lean());

    // remove product all cart if product not active
    if (updatedProduct.status !== "active") {
      await Cart.updateMany(
        { "products.id": updatedProduct._id },
        { $pull: { products: { id: updatedProduct._id } } }
      );
    }

    // thêm version mới trong redis vì dữ liệu đã bị sửa đổi
    await RedisService.set(`product_version:${productId}`, Date.now());

    return {
      ...updatedProduct,
      imagePublicUrl: CloudinaryService.generateSignedUrl(updatedProduct.imagePublicId),
    };
  },

  async delete(productId) {
    const product = await measureDB(
      "findOneAndDelete",
      "products",
      Product.findByIdAndDelete(productId)
    );

    await CloudinaryService.deleteFile(product.imagePublicId);

    // remove product from all carts
    await measureDB(
      "updateMany",
      "carts",
      Cart.updateMany({ "products.id": productId }, { $pull: { products: { id: productId } } })
    );

    // vô hiệu hóa cache bằng cách cập nhật version
    await RedisService.set(`product_version:${productId}`, Date.now());
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
        .populate("categoryId", "name")
        .sort({ quantity: -1, createdAt: -1 }) // Ưu tiên hàng còn tồn kho trước, sau đó mới đến mới nhất
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
    const products = await measureDB("find", "products", Product.find({
      createdBy: new mongoose.Types.ObjectId(userId),
      status: { $ne: "deleted" },
    })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean());

    const finalResult = products.map((product) => ({
      ...product,
      imagePublicUrl: CloudinaryService.generateSignedUrl(product.imagePublicId),
      category: {
        _id: product.categoryId._id,
        name: product.categoryId.name,
      },
    }))

    // TTL ngắn hơn (15s) so với getList (60s) là có chủ đích:
    // Đây là dữ liệu cá nhân — user kỳ vọng thấy thay đổi gần như ngay
    // sau khi tạo / sửa / xóa sản phẩm của mình. Cache danh sách này
    // không bị invalidate chủ động khi có mutation, nên TTL ngắn đóng
    // vai trò safety net để dữ liệu không bị stale quá lâu.
    await RedisService.set(cacheKey, finalResult, 15);

    return finalResult
  },
};
