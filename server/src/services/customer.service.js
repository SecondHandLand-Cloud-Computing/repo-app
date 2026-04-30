import { Customer } from "../models/customer.model.js";
import { AppError } from "../utils/AppError.js";

import { ReviewService } from "./review.service.js";
import { CloudinaryService } from "./cloudinary.service.js";
import { RedisService } from "./redis.service.js";

export const CustomerService = {
  async create(mail, password) {
    const exist = await Customer.findOne({ mail });

    if (exist) {
      throw new AppError("Email already exists", 401);
    }
    const user = await Customer.create({ mail, password });
    return { id: user._id, role: user.role };
  },

  async getList(page, limit, search) {
    const skip = (page - 1) * limit;
    let filter = { role: "customer" };

    if (search && search.trim() !== "") {
      const keyword = search.trim();

      const customers_ = await Customer.countDocuments({
        role: "customer",
        mail: { $regex: keyword, $options: "i" },
      });

      if (customers_ > 0) {
        filter.mail = { $regex: keyword, $options: "i" };
      } else {
        filter.$or = [
          { "name.firstName": { $regex: keyword, $options: "i" } },
          { "name.lastName": { $regex: keyword, $options: "i" } },
        ];
      }
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .select("-password")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Customer.countDocuments(filter),
    ]);

    const data = await Promise.all(
      customers.map(async (customer) => {
        const reviewStats = await ReviewService.getList(customer._id);
        return {
          ...customer,
          avatarPublicUrl: CloudinaryService.generateSignedUrl(customer.avatarPublicId),
          stats: {
            avg: reviewStats.averageRating,
            total: reviewStats.totalReviewCount,
          },
        };
      })
    );

    return {
      data: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async update(user, userId, payload, image = null) {
    const customer = await Customer.findById(userId);

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    if (user.id.toString() !== customer._id.toString() && user.role !== "admin") {
      throw new AppError("Access denied", 403);
    }

    let updateData = {};

    if (payload.firstName || payload.lastName) {
      updateData.name = {
        firstName: payload.firstName ?? customer.name?.firstName,
        lastName: payload.lastName ?? customer.name?.lastName,
      };
    }

    if (payload.phone) updateData.phone = payload.phone;

    if (payload.dateOfBirth) updateData.dateOfBirth = payload.dateOfBirth;

    if (payload.gender) updateData.gender = payload.gender;
    if (payload.address) updateData.address = payload.address;
    if (payload.status && user.role === "admin") updateData.status = payload.status;

    if (image) {
      const uploadResult = await CloudinaryService.uploadFile(image, "avatars");

      if (customer.avatarPublicId && customer.avatarPublicId !== "avtdf_kvmacl") {
        await CloudinaryService.deleteFile(customer.avatarPublicId);
      }
      updateData.avatarPublicId = uploadResult.public_id;
    }
    const updatedCustomer = await Customer.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        select: "-password -failedLoginAttempts",
      }
    ).lean();

    // vô hiệu hóa cache user_profile để data mới được cập nhật ngay lập tức
    await RedisService.set(`user_version:${userId}`, Date.now());

    return {
      ...updatedCustomer,
      avatarPublicUrl: CloudinaryService.generateSignedUrl(updatedCustomer.avatarPublicId),
    };
  },

  async getTopSelling(top = 10) {
    const customers = await Customer.aggregate([
      {
        // join product
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "createdBy",
          as: "products",
        },
      },
      {
        // where status = sold
        $addFields: {
          soldProducts: {
            $filter: {
              input: "$products",
              as: "p",
              cond: { $eq: ["$$p.status", "sold"] },
            },
          },
        },
      },
      {
        // sum and count
        $addFields: {
          totalRevenue: {
            $sum: "$soldProducts.price",
          },
          soldCount: {
            $size: "$soldProducts",
          },
        },
      },
      {
        // sort by revenue
        $sort: {
          totalRevenue: -1,
        },
      },

      {
        $limit: top,
      },

      {
        $project: {
          products: 0,
          soldProducts: 0,
          password: 0,
          failedLoginAttempts: 0,
        },
      },
    ]);

    return customers.map((customer) => ({
      ...customer,
      avatarPublicUrl: CloudinaryService.generateSignedUrl(customer.avatarPublicId),
    }));
  },

  async getById(id) {
    const customer = await Customer.findById(id).select("-password -failedLoginAttempts");
    if (!customer) throw new AppError("Customer not found", 404);
    return customer;
  },
};
