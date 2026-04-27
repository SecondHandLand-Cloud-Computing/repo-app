import streamifier from "streamifier";

import cloudinary from "../config/cloudinary.config.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const CloudinaryService = {
  uploadBuffer(buffer, folder, resourceType = "auto") {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType, // auto: image/video/raw
          type: "private",
          timeout: 60000,
          use_filename: true,
          unique_filename: false,
          public_id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, // to avoid name conflicts
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(buffer).pipe(stream);
    });
  },

  async uploadFile(file, _folder = null) {
    try {
      let folder = this._getFolder(file.mimetype);
      if (_folder) {
        folder += `/${_folder}`;
      }
      const resourceType = this._getResourceType(file.mimetype);

      return await this.uploadBuffer(file.buffer, folder, resourceType);
    } catch (err) {
      logger.error("[Cloudinary] Upload error:", err);
      throw new AppError("Failed to upload file", 500);
    }
  },

  generateSignedUrl(publicId, expiresInSeconds = 3600) {
    if (!publicId) return null;

    if (!env.CLOUD_NAME || !env.CLOUD_API_KEY || !env.CLOUD_API_SECRET) {
      return null;
    }

    // expires_at = UNIX timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    try {
      return cloudinary.url(publicId, {
        type: "private",
        sign_url: true,
        secure: true,
        expires_at: expiresAt,
      });
    } catch (err) {
      logger.warn("[Cloudinary] generateSignedUrl fallback:", err?.message || err);
      return null;
    }
  },

  async deleteFile(publicId) {
    if (!publicId) return null;

    // Infer resource type from stored publicId path when possible
    let resourceType = "image";
    const lower = publicId.toLowerCase();
    if (lower.startsWith("videos/") || lower.includes("/videos/")) resourceType = "video";
    if (lower.startsWith("documents/") || lower.includes("/documents/")) resourceType = "raw";

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: "private",
      });

      // Cloudinary returns { result: 'ok' } on success, 'not found' when not present
      if (!result || (result.result !== "ok" && result.result !== "not found")) {
        logger.error("[Cloudinary] destroy unexpected result:", result);
        throw new AppError("Failed to delete file", 500);
      }

      return result;
    } catch (err) {
      logger.error("[Cloudinary] deleteFile error:", err);
      throw new AppError("Failed to delete file", 500);
    }
  },

  _getFolder(mime) {
    if (mime.startsWith("image")) return "images";
    if (mime.startsWith("video")) return "videos";
    return "documents";
  },

  _getResourceType(mime) {
    if (mime.startsWith("image")) return "image";
    if (mime.startsWith("video")) return "video";
    return "raw"; // PDF, DOCX, ZIP, etc.
  },
};
