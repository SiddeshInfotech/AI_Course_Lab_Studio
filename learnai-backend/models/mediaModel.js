import prisma from "../config/db.js";
import { processVideoForStorage } from "../utils/videoProcessor.js";

// Video MIME types for processing
const VIDEO_MIME_TYPES = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo", // .avi
    "video/x-ms-wmv"   // .wmv
];

// Create a media record with file data and video optimization
export const createMedia = async (
    file,
    uploadedBy,
    entityType = null,
    entityId = null,
    customFilename = null
) => {
    const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);

    if (isVideo) {
        console.log(`Processing video file: ${file.originalname}`);

        // Process video (compression + thumbnail generation)
        const processedVideo = await processVideoForStorage(file);

        return prisma.media.create({
            data: {
                filename: customFilename || file.originalname,
                mimeType: file.mimetype,
                size: processedVideo.compressedSize,
                data: processedVideo.videoData,
                uploadedBy,
                entityType,
                entityId,

                // Video optimization fields
                thumbnail: processedVideo.thumbnailData,
                originalSize: processedVideo.originalSize,
                compressionRatio: processedVideo.compressionRatio,
                processingTime: processedVideo.processingTime,
                isCompressed: processedVideo.compressionRatio < 1,
            },
        });
    } else {
        // Non-video files - store as-is
        return prisma.media.create({
            data: {
                filename: customFilename || file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                data: file.buffer,
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

// Get media by ID (without data for listing, includes optimization metadata)
export const getMediaById = (id) =>
    prisma.media.findUnique({
        where: { id },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            uploadedBy: true,
            entityType: true,
            entityId: true,
            originalSize: true,
            compressionRatio: true,
            processingTime: true,
            isCompressed: true,
            createdAt: true,
        },
    });

// Get media with data (for streaming/download)
export const getMediaWithData = (id) =>
    prisma.media.findUnique({
        where: { id },
    });

// Get media thumbnail only
export const getMediaThumbnail = (id) =>
    prisma.media.findUnique({
        where: { id },
        select: {
            id: true,
            thumbnail: true,
            mimeType: true,
        },
    });

// Get all media for an entity
export const getMediaByEntity = (entityType, entityId) =>
    prisma.media.findMany({
        where: { entityType, entityId },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            originalSize: true,
            compressionRatio: true,
            isCompressed: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

// List all media (for admin) with optimization info
export const getAllMedia = (limit = 50, offset = 0) =>
    prisma.media.findMany({
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            uploadedBy: true,
            entityType: true,
            entityId: true,
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

// Get video-specific media with optimization details
export const getVideoMedia = (limit = 20, offset = 0, courseId = null) =>
    prisma.media.findMany({
        where: {
            mimeType: { in: VIDEO_MIME_TYPES },
            ...(courseId && { entityType: 'lesson' }), // Filter by course through lessons
        },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
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

// Delete media
export const deleteMedia = (id) =>
    prisma.media.delete({ where: { id } });

// Update media entity association
export const updateMediaEntity = (id, entityType, entityId) =>
    prisma.media.update({
        where: { id },
        data: { entityType, entityId },
    });

// Get total media count
export const getMediaCount = () =>
    prisma.media.count();

// Get video count specifically
export const getVideoCount = () =>
    prisma.media.count({
        where: { mimeType: { in: VIDEO_MIME_TYPES } }
    });

// Get storage used (sum of all file sizes)
export const getStorageUsed = async () => {
    const result = await prisma.media.aggregate({
        _sum: { size: true },
    });
    return result._sum.size || 0;
};

// Get storage statistics with compression info
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
