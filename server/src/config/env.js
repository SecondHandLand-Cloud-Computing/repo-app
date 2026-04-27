import dotenv from "dotenv";
dotenv.config();

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  return value === "true";
};

export const env = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  OTP_EXPIRE_SEC: process.env.OTP_EXPIRE_SEC,
  CLOUD_NAME: process.env.CLOUD_NAME,
  CLOUD_API_KEY: process.env.CLOUD_API_KEY,
  CLOUD_API_SECRET: process.env.CLOUD_API_SECRET,
  COOKIE_SECURE: parseBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production"),
};
