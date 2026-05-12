import { User } from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { RedisService } from "./redis.service.js";

export const UserService = {
  async getById(id) {
    // tạo cache key với version
    let currentVersion = await RedisService.get(`user_version:${id}`);
    if (!currentVersion) currentVersion = 1;

    const cacheKey = `user_profile:${id}:v${currentVersion}`;
    
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
    return User.findOne({ mail: mail });
  },

  async delete(id) {
    const user = await User.findById(id);
    if (!user) throw new AppError("User not found", 404);
    await user.deleteOne();

    // remove cache bằng cách cập nhật version
    await RedisService.set(`user_version:${id}`, Date.now());
    return user;
  },
};
