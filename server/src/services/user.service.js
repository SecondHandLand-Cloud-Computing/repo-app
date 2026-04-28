import { User } from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { RedisService } from "./redis.service.js";

export const UserService = {
  async getById(id) {
    // tạo cache key
    const cacheKey = `user_profile:${id}`;
    // kiểm tra có dữ liệu được lưu trong redis không
    const cacheData = await RedisService.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }

    // neu khong co du lieu trong redis -> truy van mongoDB
    const user = await User.findById(id);
    if (!user) throw new AppError("User not found", 404);

    // luu vao redis
    await RedisService.set(cacheKey, user, 300);
    return user;
  },

  async getByMail(mail) {
    const user = await User.findOne({ mail: mail });
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  async delete(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError("User not found", 404);

    // remove cache
    await RedisService.del(`user_profile:${id}`);
    return user;
  },
};
