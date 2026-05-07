import { Category } from "../models/category.model.js";
import { CloudinaryService } from "../services/cloudinary.service.js";
import { RedisService} from "./redis.service.js";


export const CategoryService = {
  async getList() {
    // tạo cache key tĩnh
    const cacheKey = "category_list_all";
    // kiểm tra dữ liệu có nằm trong redis hay không
    const cacheData = await RedisService.get(cacheKey);
    if (cacheData) {
      return cacheData;
    } 

    // nếu dữ liệu không có trong redis -> truy vấn mongoDB
    const categories = await Category.find({}).lean();

    const result = await Promise.all(
      categories.map((category) => ({
        ...category,
        imagePublicUrl: CloudinaryService.generateSignedUrl(category.imagePublicId),
      }))
    );

    // luu vao redis
    await RedisService.set(cacheKey, result, 3600);
    return result;
  },


  async getTopSelling() {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$categoryId", "$$categoryId"] }, { $eq: ["$status", "sold"] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$price" },
                soldCount: { $sum: 1 },
              },
            },
          ],
          as: "stats",
        },
      },
      {
        $addFields: {
          totalRevenue: {
            $ifNull: [{ $arrayElemAt: ["$stats.totalRevenue", 0] }, 0],
          },
          soldCount: {
            $ifNull: [{ $arrayElemAt: ["$stats.soldCount", 0] }, 0],
          },
        },
      },
      {
        $project: {
          stats: 0,
        },
      },
      {
        $sort: {
          totalRevenue: -1,
        },
      },
    ]);

    return categories.map((category) => ({
      ...category,
      imagePublicUrl: CloudinaryService.generateSignedUrl(category.imagePublicId),
    }));
  },
};
