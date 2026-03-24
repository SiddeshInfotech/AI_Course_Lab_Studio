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

// GET /api/media/:id — get/stream media file (public for content delivery)
export const getMedia = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const media = await getMediaWithData(id);

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        // Set appropriate headers
        res.setHeader("Content-Type", media.mimeType);
        res.setHeader("Content-Length", media.size);
        res.setHeader("Content-Disposition", `inline; filename="${media.filename}"`);

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
