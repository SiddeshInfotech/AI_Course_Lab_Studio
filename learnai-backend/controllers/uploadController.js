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
    getSignedMediaUrl,
} from "../models/mediaModel.js";
import {
    generateSignedMediaUrl,
    generateWatermarkedUrl,
    verifySignedMediaUrl,
    revokeSignedUrl,
    incrementDownloadCount,
    isUrlRevoked
} from "../utils/signedUrlService.js";
import { getSignedUrl, getPublicUrl } from "../config/storage.js";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_TYPES = {
    video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const ALL_ALLOWED_TYPES = [...ALLOWED_TYPES.video, ...ALLOWED_TYPES.image, ...ALLOWED_TYPES.document];

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file provided" });
        }

        const file = req.file;

        if (file.size > MAX_FILE_SIZE) {
            return res.status(400).json({
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            });
        }

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
            url: media.url,
            thumbnailUrl: media.thumbnailUrl,
            entityType: media.entityType,
            entityId: media.entityId,
            createdAt: media.createdAt,
        });
    } catch (error) {
        console.error("❌ Upload error:", error.message);
        console.error("Stack:", error.stack);

        const errorMessage = error.message || "Failed to upload file";
        const isStorageError = errorMessage.includes('MinIO') || errorMessage.includes('storage') || errorMessage.includes('S3');
        const isBufferError = errorMessage.includes('buffer') || errorMessage.includes('empty');

        let statusCode = 500;
        let detailedMessage = errorMessage;

        if (isBufferError) {
            statusCode = 400;
            detailedMessage = `Invalid file: ${errorMessage}`;
        } else if (isStorageError) {
            statusCode = 503;
            detailedMessage = `Storage service error: ${errorMessage}. Please try again.`;
        }

        res.status(statusCode).json({
            message: detailedMessage,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files provided" });
        }

        const { entityType, entityId } = req.body;
        const results = [];
        const errors = [];

        for (const file of req.files) {
            if (file.size > MAX_FILE_SIZE) {
                errors.push({
                    filename: file.originalname,
                    error: "File too large",
                });
                continue;
            }

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
                    url: media.url,
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
        console.error("❌ Multiple upload error:", error.message);
        console.error("Stack:", error.stack);

        const errorMessage = error.message || "Failed to upload files";
        const isStorageError = errorMessage.includes('MinIO') || errorMessage.includes('storage') || errorMessage.includes('S3');

        let statusCode = 500;
        let detailedMessage = errorMessage;

        if (isStorageError) {
            statusCode = 503;
            detailedMessage = `Storage service error: ${errorMessage}. Please try again.`;
        }

        res.status(statusCode).json({
            message: detailedMessage,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getMedia = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const media = await getMediaById(id);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        const signedData = await getSignedMediaUrl(id, 3600);

        if (!signedData) {
            return res.status(404).json({ message: "Media file not found" });
        }

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
        res.setHeader("Content-Type", signedData.mimeType);
        res.setHeader("Content-Length", media.size);

        const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
        res.setHeader("Content-Disposition", `${disposition}; filename="${media.filename}"`);

        if (req.accessType === 'watermarked' || req.query.watermark === 'true') {
            res.setHeader("X-Watermark", `User-${req.user.userId}-${Date.now()}`);
        }

        console.log(`Media access: User ${req.user.userId} accessed media ${id} via signed URL`);

        res.redirect(302, signedData.url);

    } catch (error) {
        console.error("Get media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

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
                url: m.url,
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

export const getMediaInfo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const media = await getMediaById(id);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        res.json({
            ...media,
            url: media.url,
        });
    } catch (error) {
        console.error("Get media info error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

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

export const getEntityMedia = async (req, res) => {
    try {
        const { type, id } = req.params;
        const media = await getMediaByEntity(type, parseInt(id));

        res.json(
            media.map((m) => ({
                ...m,
                url: m.url,
            }))
        );
    } catch (error) {
        console.error("Get entity media error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const generateMediaSignedUrl = async (req, res) => {
    try {
        const mediaId = parseInt(req.params.id);
        const userId = req.user.userId;
        const media = await getMediaById(mediaId);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        const {
            expiresIn = 24 * 60 * 60 * 1000,
            allowWatermark = false,
            maxDownloads = null,
            accessType = 'view'
        } = req.body;

        const userInfo = {
            username: req.user.username || `User-${userId}`,
            id: userId
        };

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

        const storageSignedData = await getSignedMediaUrl(mediaId, expiresIn / 1000);

        if (!storageSignedData) {
            return res.status(404).json({ message: "Media file not found in storage" });
        }

        res.json({
            success: true,
            media: {
                id: media.id,
                filename: media.filename,
                mimeType: media.mimeType,
                size: media.size
            },
            signedUrl: {
                url: storageSignedData.url,
                expiresAt: new Date(Date.now() + expiresIn).toISOString(),
                expiresIn: expiresIn / 1000,
                token: signedUrlData.token,
            },
            instructions: {
                usage: "Use the signed URL to access the media file securely",
                expiration: new Date(Date.now() + expiresIn).toISOString(),
                restrictions: signedUrlData.restrictions || {}
            }
        });

    } catch (error) {
        console.error("Generate signed URL error:", error);
        res.status(500).json({ message: "Failed to generate signed URL" });
    }
};

export const getSignedMedia = async (req, res) => {
    try {
        const token = req.params.token;
        const clientIp = req.ip;
        const userAgent = req.headers['user-agent'];

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

        if (isUrlRevoked(verification.payload.nonce)) {
            return res.status(401).json({
                message: "This signed URL has been revoked"
            });
        }

        const { mediaId, userId, accessType } = verification.payload;

        const signedData = await getSignedMediaUrl(mediaId, 3600);

        if (!signedData) {
            return res.status(404).json({ message: "Media not found" });
        }

        incrementDownloadCount(token);

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Cache-Control", "private, no-cache");
        res.setHeader("Content-Type", signedData.mimeType);

        if (accessType === 'watermarked') {
            res.setHeader("X-Watermark-Info", `User-${userId}-${Date.now()}`);
        }

        console.log(`Signed media access: User ${userId} accessed media ${mediaId} via signed URL (${accessType})`);

        res.redirect(302, signedData.url);

    } catch (error) {
        console.error("Signed media access error:", error);
        res.status(500).json({ message: "Failed to access signed media" });
    }
};

export const revokeMediaAccess = async (req, res) => {
    try {
        const token = req.params.token;
        const userId = req.user.userId;
        const isAdmin = req.user.isAdmin;

        const verification = verifySignedMediaUrl(token, { ignoreExpiration: true });

        if (!verification.valid && verification.error !== 'URL_EXPIRED') {
            return res.status(400).json({ message: "Invalid signed URL token" });
        }

        const tokenUserId = verification.payload?.userId;

        if (!isAdmin && tokenUserId !== userId) {
            return res.status(403).json({
                message: "You can only revoke your own signed URLs"
            });
        }

        const revoked = await revokeSignedUrl(token);

        if (revoked) {
            res.json({
                message: "Signed URL has been revoked successfully",
                token: token.substring(0, 16) + "..."
            });

            console.log(`Signed URL revoked: User ${userId} revoked token for media access`);
        } else {
            res.status(400).json({ message: "Failed to revoke signed URL" });
        }

    } catch (error) {
        console.error("Revoke media access error:", error);
        res.status(500).json({ message: "Failed to revoke signed URL" });
    }
};
