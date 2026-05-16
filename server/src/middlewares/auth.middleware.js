import { verifyToken } from "../utils/jwt.js";

export const requireAuth = (req, res, next) => {
  // Lấy token từ Cookie HOẶC từ Header Authorization
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid token" });
  }
  req.user = payload;

  next();
};

export const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = payload || null;
  } catch (err) {
    req.user = null;
  }

  next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
