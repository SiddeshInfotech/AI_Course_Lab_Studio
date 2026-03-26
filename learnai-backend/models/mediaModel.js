import prisma from "../config/db.js";
import {
    processVideoForStorage,
    processImageForStorage,
    processDocumentForStorage,
    deleteVideoFiles,
    getVideoSignedUrl,
    getThumbnailSignedUrl
} from "../utils/videoProcessor.js";
import { deleteFile, getSignedUrl, getPublicUrl, getStorageType } from "../config/storage.js";

const VIDEO_MIME_TYPES = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv"
];

const IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
];

export const createMedia = async (
    file,
    uploadedBy,
    entityType = null,
    entityId = null,
    customFilename = null
) => {
    const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
    const isImage = IMAGE_MIME_TYPES.includes(file.mimetype);
    const storageType = getStorageType();

    const filename = customFilename || file.originalname;

    if (isVideo) {
        console.log(`📹 Processing video file: ${file.originalname}`);

        if (!file.buffer || file.buffer.length === 0) {
            throw new Error('Video file buffer is empty or missing');
        }

        const processedVideo = await processVideoForStorage(
            file.buffer,
            file.originalname
        );

        return prisma.media.create({
            data: {
                filename: filename,
                mimeType: processedVideo.mimeType,
                size: processedVideo.compressedSize,
                storageType: processedVideo.storageType,
                storageKey: processedVideo.storageKey,
                url: processedVideo.url,
                uploadedBy,
                entityType,
                entityId,
                thumbnailStorageKey: processedVideo.thumbnailStorageKey,
                thumbnailUrl: processedVideo.thumbnailUrl,
                originalSize: processedVideo.originalSize,
                compressionRatio: processedVideo.compressionRatio,
                processingTime: processedVideo.processingTime,
                isCompressed: processedVideo.compressionRatio < 1,
            },
        });
    } else if (isImage) {
        if (!file.buffer || file.buffer.length === 0) {
            throw new Error('Image file buffer is empty or missing');
        }

        const processedImage = await processImageForStorage(
            file.buffer,
            file.originalname,
            file.mimetype
        );

        return prisma.media.create({
            data: {
                filename: filename,
                mimeType: file.mimetype,
                size: processedImage.size,
                storageType: processedImage.storageType,
                storageKey: processedImage.storageKey,
                url: processedImage.url,
                uploadedBy,
                entityType,
                entityId,
                originalSize: file.size,
                compressionRatio: 1.0,
                isCompressed: false,
            },
        });
    } else {
        if (!file.buffer || file.buffer.length === 0) {
            throw new Error('Document file buffer is empty or missing');
        }

        const processedDoc = await processDocumentForStorage(
            file.buffer,
            file.originalname
        );

        return prisma.media.create({
            data: {
                filename: filename,
                mimeType: file.mimetype,
                size: processedDoc.size,
                storageType: processedDoc.storageType,
                storageKey: processedDoc.storageKey,
                url: processedDoc.url,
                uploadedBy,
                entityType,
                entityId,
                originalSize: file.size,
                compressionRatio: 1.0,
                isCompressed: false,
            },
        });
    }
};

export const getMediaById = (id) =>
    prisma.media.findUnique({
        where: { id },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            storageType: true,
            storageKey: true,
            url: true,
            uploadedBy: true,
            entityType: true,
            entityId: true,
            thumbnailStorageKey: true,
            thumbnailUrl: true,
            originalSize: true,
            compressionRatio: true,
            processingTime: true,
            isCompressed: true,
            createdAt: true,
        },
    });

export const getMediaWithData = async (id) => {
    const media = await prisma.media.findUnique({
        where: { id },
    });

    if (!media || !media.storageKey) {
        return media;
    }

    const signedUrl = await getSignedUrl(media.storageKey, 3600);

    return {
        ...media,
        signedUrl: signedUrl,
    };
};

export const getMediaThumbnail = (id) =>
    prisma.media.findUnique({
        where: { id },
        select: {
            id: true,
            thumbnailStorageKey: true,
            thumbnailUrl: true,
            mimeType: true,
        },
    });

export const getMediaByEntity = (entityType, entityId) =>
    prisma.media.findMany({
        where: { entityType, entityId },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            storageType: true,
            storageKey: true,
            url: true,
            thumbnailStorageKey: true,
            thumbnailUrl: true,
            originalSize: true,
            compressionRatio: true,
            isCompressed: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

export const getAllMedia = (limit = 50, offset = 0) =>
    prisma.media.findMany({
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            storageType: true,
            storageKey: true,
            url: true,
            uploadedBy: true,
            entityType: true,
            entityId: true,
            thumbnailStorageKey: true,
            thumbnailUrl: true,
            originalSize: true,
            compressionRatio: true,
            processingTime: true,
            isCompressed: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
    });

export const getVideoMedia = (limit = 20, offset = 0, courseId = null) =>
    prisma.media.findMany({
        where: {
            mimeType: { in: VIDEO_MIME_TYPES },
        },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            storageType: true,
            storageKey: true,
            url: true,
            thumbnailStorageKey: true,
            thumbnailUrl: true,
            originalSize: true,
            compressionRatio: true,
            processingTime: true,
            isCompressed: true,
            entityType: true,
            entityId: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
    });

export const deleteMedia = async (id) => {
    const media = await prisma.media.findUnique({
        where: { id },
    });

    if (media?.storageKey) {
        try {
            await deleteFile(media.storageKey);
        } catch (err) {
            console.error("Failed to delete from storage:", err);
        }
    }

    if (media?.thumbnailStorageKey) {
        try {
            await deleteFile(media.thumbnailStorageKey);
        } catch (err) {
            console.error("Failed to delete thumbnail from storage:", err);
        }
    }

    return prisma.media.delete({ where: { id } });
};

export const updateMediaEntity = (id, entityType, entityId) =>
    prisma.media.update({
        where: { id },
        data: { entityType, entityId },
    });

export const getMediaCount = () =>
    prisma.media.count();

export const getVideoCount = () =>
    prisma.media.count({
        where: { mimeType: { in: VIDEO_MIME_TYPES } }
    });

export const getStorageUsed = async () => {
    const result = await prisma.media.aggregate({
        _sum: { size: true },
    });
    return result._sum.size || 0;
};

export const getStorageStats = async () => {
    const [allMedia, videoStats] = await Promise.all([
        prisma.media.aggregate({
            _sum: { size: true, originalSize: true },
            _count: { id: true },
        }),
        prisma.media.aggregate({
            where: { mimeType: { in: VIDEO_MIME_TYPES } },
            _sum: { size: true, originalSize: true },
            _count: { id: true },
            _avg: { compressionRatio: true, processingTime: true },
        })
    ]);

    const totalSize = allMedia._sum.size || 0;
    const totalOriginalSize = allMedia._sum.originalSize || 0;
    const videoSize = videoStats._sum.size || 0;
    const videoOriginalSize = videoStats._sum.originalSize || 0;

    return {
        totalFiles: allMedia._count.id,
        totalStorageUsed: totalSize,
        totalOriginalSize: totalOriginalSize,
        totalSpaceSaved: totalOriginalSize - totalSize,
        overallCompressionRatio: totalOriginalSize > 0 ? totalSize / totalOriginalSize : 1,

        videoFiles: videoStats._count.id,
        videoStorageUsed: videoSize,
        videoOriginalSize: videoOriginalSize,
        videoSpaceSaved: videoOriginalSize - videoSize,
        avgCompressionRatio: videoStats._avg.compressionRatio || 1,
        avgProcessingTime: videoStats._avg.processingTime || 0,
    };
};

export const getSignedMediaUrl = async (mediaId, expiresIn = 3600) => {
    const media = await prisma.media.findUnique({
        where: { id: mediaId },
        select: { storageKey: true, mimeType: true },
    });

    if (!media || !media.storageKey) {
        return null;
    }

    const signedUrl = await getSignedUrl(media.storageKey, expiresIn);
    return {
        url: signedUrl,
        mimeType: media.mimeType,
    };
};
