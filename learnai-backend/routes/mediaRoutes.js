import express from "express";
import multer from "multer";
import { getMedia, getSignedMedia, generateMediaSignedUrl, revokeMediaAccess } from "../controllers/uploadController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mediaAuthMiddleware from "../middleware/mediaAuthMiddleware.js";
import { createMediaRateLimitMiddleware, bandwidthRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
});

// Rate limiting middlewares
const mediaAccessRateLimit = createMediaRateLimitMiddleware('media_access');
const bandwidthRateLimit = bandwidthRateLimitMiddleware;

// Protected route to stream/download media - requires authentication, authorization, and rate limiting
router.get("/:id",
    authMiddleware,
    mediaAccessRateLimit,
    mediaAuthMiddleware,
    bandwidthRateLimit,
    getMedia
);

// Generate signed URL for secure media access
router.post("/:id/signed-url",
    authMiddleware,
    mediaAccessRateLimit,
    mediaAuthMiddleware,
    generateMediaSignedUrl
);

// Access media via signed URL - no authentication required but URL must be valid
router.get("/signed/:token",
    bandwidthRateLimit,
    getSignedMedia
);

// Revoke signed URL access (admin or owner only)
router.delete("/signed/:token/revoke",
    authMiddleware,
    revokeMediaAccess
);

export default router;
