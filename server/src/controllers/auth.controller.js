import bcrypt from "bcryptjs";

import { AuthService } from "../services/auth.service.js";
import { MailService } from "../services/mail.service.js";
import { RedisService } from "../services/redis.service.js";
import { UserService } from "../services/user.service.js";
import { CustomerService } from "../services/customer.service.js";
import { WalletService } from "../services/wallet.service.js";
import { CartService } from "../services/cart.service.js";

import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { generateOtpAndHash, generateToken } from "../utils/crypto.js";

export const sendOTP = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const { mail } = req.body;
  const { otpRaw, otpHashed } = await generateOtpAndHash();
  const token = generateToken();

  const key = `otp:${token}`;
  let value;
  const isExisted = await UserService.getByMail(mail);
  if (type === "register") {
    const { password } = req.body;

    if (isExisted) {
      return res.status(400).json({ message: "Email already exists" });
    }

    value = { mail, password, otpHashed };
  } else if (type === "forgot-password") {
    if (!isExisted) {
      return res.status(404).json({ message: "User not found" });
    }

    value = { mail, otpHashed };
  }

  await RedisService.set(key, value, env.OTP_EXPIRE_SEC);

  // Send OTP email
  await MailService.sendOtp(mail, otpRaw);

  return res.status(200).json({ message: "OTP sent", token: token });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { type, token } = req.query;
  const { otp } = req.body;

  const key = `otp:${token}`;
  const value = await RedisService.get(key);

  if (!value || !(await bcrypt.compare(otp.toString(), value.otpHashed))) {
    return res.status(404).json({ message: "Invalid OTP" });
  }

  return res.status(200).json({
    message: "OTP verified successfully",
    type: type,
  });
});

export const register = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const key = `otp:${token}`;
  const value = await RedisService.get(key);

  if (!value) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const { id, role } = await CustomerService.create(value.mail, value.password);

  await WalletService.create(id);
  await CartService.create(id);

  const accessToken = signToken({ sub: id, role: role });

  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });

  return res.status(200).json({ message: "Register successful" });
});

export const login = asyncHandler(async (req, res) => {
  const { mail, password } = req.body;

  // transfer the logic to the service
  const { id, role } = await AuthService.login(mail, password);

  const accessToken = signToken({ sub: id, role: role });

  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });
  return res.status(200).json({
    message: "Login successful",
    data: {
      id,
      role,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const userId = req.user.sub;

  await AuthService.changePassword(userId, oldPassword, newPassword);

  res.status(200).json({ message: "Password changed successfully." });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { mail, newPassword } = req.body;

  await AuthService.forgotPassword(mail, newPassword);

  return res.status(200).json({ message: "Password updated successfully" });
});

export const logout = asyncHandler(async (req, res) => {
  // delete cookie token session
  res.clearCookie("token", {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logout successfully" });
});
