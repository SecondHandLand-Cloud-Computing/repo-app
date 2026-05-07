import { User } from "../models/user.model.js";
import { AppError } from "../utils/AppError.js";

export const AuthService = {
  async login(mail, password) {
    const user = await User.findOne({ mail });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    } else if (user.status === "inactive") {
      throw new AppError("Your account has locked", 400);
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 3) user.status = "inactive";

      await user.save();
      throw new AppError("Invalid email or password", 401);
    }
    // reset failed login attempts
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      await user.save();
    }

    return { id: user._id, role: user.role };
  },

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!(await user.comparePassword(oldPassword))) {
      throw new AppError("Incorrect current password", 401);
    }

    user.password = newPassword;
    await user.save();
  },
  async forgotPassword(mail, newPassword) {
    const user = await User.findOne({ mail });
    // check if the user not exists
    if (!user) {
      throw new AppError("User not found", 404);
    }
    user.password = newPassword;
    await user.save();
  },
};
