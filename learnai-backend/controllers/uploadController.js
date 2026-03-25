import {
    createMedia,
    getMediaById,
    getMediaWithData,
    getMediaByEntity,
    getAllMedia,
    deleteMedia,
    updateMediaEntity,
    getMediaCount,
    getStorageUsed,
} from "../models/mediaModel.js";
import {
    generateSignedMediaUrl,
    generateWatermarkedUrl,
    verifySignedMediaUrl,
    revokeSignedUrl,
    incrementDownloadCount,
    isUrlRevoked
} from "../utils/signedUrlService.js";

// Max file size: 100MB (adjust as needed)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = {
    video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const ALL_ALLOWED_TYPES = [...ALLOWED_TYPES.video, ...ALLOWED_TYPES.image, ...ALLOWED_TYPES.document];

// POST /api/admin/upload — upload a file
export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file provided" });
        }

        const file = req.file;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return res.status(400).json({
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            });
        }

        // Validate MIME type
        if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
            return res.status(400).json({
                message: "File type not allowed",
                allowedTypes: ALL_ALLOWED_TYPES,
            });
        }

        const { entityType, entityId, title } = req.body;
        const sanitizedTitle =
            typeof title === "string" && title.trim().length > 0
                ? title.trim().replace(/[\\/:*?"<>|]/g, "")
                : null;

        const extensionFromName = file.originalname.includes(".")
            ? file.originalname.substring(file.originalname.lastIndexOf("."))
            : "";
        const finalFilename = sanitizedTitle
            ? `${sanitizedTitle}${extensionFromName}`
            : null;

        const media = await createMedia(
            file,
            req.user.userId,
            entityType || null,
            entityId ? parseInt(entityId) : null,
            finalFilename
        );

        res.status(201).json({
            id: media.id,
            filename: media.filename,
            mimeType: media.mimeType,
            size: media.size,
            entityType: media.entityType,
            entityId: media.entityId,
            createdAt: media.createdAt,
            url: `/api/media/${media.id}`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/admin/upload/multiple — upload multiple files
export const uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files provided" });
        }

        const { entityType, entityId } = req.body;
        const results = [];
        const errors = [];

        for (const file of req.files) {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                errors.push({
                    filename: file.originalname,
                    error: "File too large",
                });
                continue;
            }

            // Validate MIME type
            if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
                errors.push({
                    filename: file.originalname,
                    error: "File type not allowed",
                });
                continue;
            }

            try {
                const media = await createMedia(
                    file,
                    req.user.userId,
                    entityType || null,
                    entityId ? parseInt(entityId) : null
                );

                results.push({
                    id: media.id,
                    filename: media.filename,
                    mimeType: media.mimeType,
                    size: media.size,
                    url: `/api/media/${media.id}`,
                });
            } catch (err) {
                errors.push({
                    filename: file.originalname,
                    error: "Upload failed",
                });
            }
        }

        res.status(201).json({
            uploaded: results,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error("Multiple upload error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/media/:id — get/stream media file (protected - requires authentication)
export const getMedia = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Media and authorization already validated by mediaAuthMiddleware
        const media = req.media || await getMediaWithData(id);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        // Add security headers
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

        // Set appropriate headers
        res.setHeader("Content-Type", media.mimeType);
        res.setHeader("Content-Length", media.size);

        // Set download filename based on access type
        const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
        res.setHeader("Content-Disposition", `${disposition}; filename="${media.filename}"`);

        // Add watermark info for watermarked content
        if (req.accessType === 'watermarked' || req.query.watermark === 'true') {
            res.setHeader("X-Watermark", `User-${req.user.userId}-${Date.now()}`);
        }

        // Handle range requests for video streaming
        const range = req.headers.range;
        if (range && media.mimeType.startsWith("video/")) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : media.size - 1;
            const chunkSize = end - start + 1;

            res.status(206);
            res.setHeader("Content-Range", `bytes ${start}-${end}/${media.size}`);
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Content-Length", chunkSize);

            // Send chunk of data
            const chunk = media.data.slice(start, end + 1);
            return res.send(Buffer.from(chunk));
        }

        // Send full file
        res.send(Buffer.from(media.data));

        // Log access for audit purposes
        console.log(`Media access: User ${req.user.userId} accessed media ${id} (${req.accessType || 'direct'})`);

    } catch (error) {
        console.error("Get media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/admin/media — list all media (admin only)
export const listMedia = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const [media, total, storageUsed] = await Promise.all([
            getAllMedia(limit, offset),
            getMediaCount(),
            getStorageUsed(),
        ]);

        res.json({
            media: media.map((m) => ({
                ...m,
                url: `/api/media/${m.id}`,
            })),
            pagination: {
                total,
                limit,
                offset,
            },
            storageUsed,
            storageUsedFormatted: formatBytes(storageUsed),
        });
    } catch (error) {
        console.error("List media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/admin/media/:id — get media info (admin only)
export const getMediaInfo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const media = await getMediaById(id);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        res.json({
            ...media,
            url: `/api/media/${media.id}`,
        });
    } catch (error) {
        console.error("Get media info error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/admin/media/:id — delete media (admin only)
export const removeMedia = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const media = await getMediaById(id);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        await deleteMedia(id);
        res.json({ message: "Media deleted" });
    } catch (error) {
        console.error("Delete media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/admin/media/:id/assign — assign media to an entity
export const assignMedia = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { entityType, entityId } = req.body;

        const media = await getMediaById(id);
        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        await updateMediaEntity(id, entityType, entityId ? parseInt(entityId) : null);
        res.json({ message: "Media assigned" });
    } catch (error) {
        console.error("Assign media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/admin/media/entity/:type/:id — get media for an entity
export const getEntityMedia = async (req, res) => {
    try {
        const { type, id } = req.params;
        const media = await getMediaByEntity(type, parseInt(id));

        res.json(
            media.map((m) => ({
                ...m,
                url: `/api/media/${m.id}`,
            }))
        );
    } catch (error) {
        console.error("Get entity media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Helper: format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ===============================
// ENHANCED SECURITY FEATURES
// ===============================

/**
 * POST /api/media/:id/signed-url — Generate signed URL for secure media access
 */
export const generateMediaSignedUrl = async (req, res) => {
    try {
        const mediaId = parseInt(req.params.id);
        const userId = req.user.userId;
        const media = req.media; // Available from mediaAuthMiddleware

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        const {
            expiresIn = 24 * 60 * 60 * 1000, // 24 hours default
            allowWatermark = false,
            maxDownloads = null,
            accessType = 'view'
        } = req.body;

        // Get user info for watermarking
        const userInfo = {
            username: req.user.username || `User-${userId}`,
            id: userId
        };

        // Generate appropriate URL type
        let signedUrlData;
        if (allowWatermark && (media.mimeType.startsWith('image/') || media.mimeType.startsWith('video/'))) {
            signedUrlData = generateWatermarkedUrl(mediaId, userId, userInfo);
        } else {
            signedUrlData = generateSignedMediaUrl(mediaId, userId, {
                expiresIn,
                allowedIp: req.ip,
                userAgent: req.headers['user-agent'],
                maxDownloads,
                accessType
            });
        }

        // Convert relative URL to absolute URL for frontend
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fullSignedUrl = {
            ...signedUrlData,
            url: signedUrlData.url.startsWith('http') ? signedUrlData.url : `${baseUrl}${signedUrlData.url}`
        };

        res.json({
            success: true,
            media: {
                id: media.id,
                filename: media.filename,
                mimeType: media.mimeType,
                size: media.size
            },
            signedUrl: fullSignedUrl,
            instructions: {
                usage: "Use the signed URL to access the media file securely",
                expiration: fullSignedUrl.expiresAt,
                restrictions: fullSignedUrl.restrictions || {}
            }
        });

    } catch (error) {
        console.error("Generate signed URL error:", error);
        res.status(500).json({ message: "Failed to generate signed URL" });
    }
};

/**
 * GET /api/media/signed/:token — Access media via signed URL
 */
export const getSignedMedia = async (req, res) => {
    try {
        const token = req.params.token;
        const clientIp = req.ip;
        const userAgent = req.headers['user-agent'];

        // Verify the signed URL
        const verification = verifySignedMediaUrl(token, {
            clientIp,
            userAgent
        });

        if (!verification.valid) {
            return res.status(401).json({
                message: verification.message,
                error: verification.error
            });
        }

        // Check if URL has been revoked
        if (isUrlRevoked(verification.payload.nonce)) {
            return res.status(401).json({
                message: "This signed URL has been revoked"
            });
        }

        const { mediaId, userId, accessType } = verification.payload;

        // Get media data
        const media = await getMediaWithData(mediaId);
        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        // Track download for rate limiting
        incrementDownloadCount(token);

        // Set security headers
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Cache-Control", "private, no-cache");

        // Set content headers
        res.setHeader("Content-Type", media.mimeType);
        res.setHeader("Content-Length", media.size);

        // Set disposition based on access type
        const disposition = accessType === 'download' ? 'attachment' : 'inline';
        res.setHeader("Content-Disposition", `${disposition}; filename="${media.filename}"`);

        // Add watermark header for watermarked content
        if (accessType === 'watermarked') {
            res.setHeader("X-Watermark-Info", `User-${userId}-${Date.now()}`);
        }

        // Handle range requests for video streaming
        const range = req.headers.range;
        if (range && media.mimeType.startsWith("video/")) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : media.size - 1;
            const chunkSize = end - start + 1;

            res.status(206);
            res.setHeader("Content-Range", `bytes ${start}-${end}/${media.size}`);
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Content-Length", chunkSize);

            const chunk = media.data.slice(start, end + 1);
            return res.send(Buffer.from(chunk));
        }

        // Send full file
        res.send(Buffer.from(media.data));

        // Log signed access
        console.log(`Signed media access: User ${userId} accessed media ${mediaId} via signed URL (${accessType})`);

    } catch (error) {
        console.error("Signed media access error:", error);
        res.status(500).json({ message: "Failed to access signed media" });
    }
};

/**
 * DELETE /api/media/signed/:token/revoke — Revoke signed URL access
 */
export const revokeMediaAccess = async (req, res) => {
    try {
        const token = req.params.token;
        const userId = req.user.userId;
        const isAdmin = req.user.isAdmin;

        // Verify token to get payload (even if expired)
        const verification = verifySignedMediaUrl(token, { ignoreExpiration: true });

        if (!verification.valid && verification.error !== 'URL_EXPIRED') {
            return res.status(400).json({ message: "Invalid signed URL token" });
        }

        const tokenUserId = verification.payload?.userId;

        // Check authorization - user can revoke their own URLs, admins can revoke any
        if (!isAdmin && tokenUserId !== userId) {
            return res.status(403).json({
                message: "You can only revoke your own signed URLs"
            });
        }

        // Revoke the URL
        const revoked = await revokeSignedUrl(token);

        if (revoked) {
            res.json({
                message: "Signed URL has been revoked successfully",
                token: token.substring(0, 16) + "..." // Partial token for confirmation
            });

            // Log revocation
            console.log(`Signed URL revoked: User ${userId} revoked token for media access`);
        } else {
            res.status(400).json({ message: "Failed to revoke signed URL" });
        }

    } catch (error) {
        console.error("Revoke signed URL error:", error);
        res.status(500).json({ message: "Failed to revoke signed URL" });
    }
};
