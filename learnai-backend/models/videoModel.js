import prisma from '../config/db.js';
import { deleteVideoFile } from '../services/videoService.js';

/**
 * Create a new video record in database
 */
export const createVideoRecord = async (data) => {
    return prisma.media.create({
        data: {
            filename: data.filename,
            mimeType: data.mimeType,
            size: data.size,
            storageType: 'local',
            storageKey: data.storageKey,
            url: data.url,
            uploadedBy: data.uploadedBy,
            entityType: data.entityType || null,
            entityId: data.entityId || null,
            thumbnailUrl: data.thumbnailUrl || null,
            originalSize: data.size,
            compressionRatio: 1.0,
            isCompressed: false
        }
    });
};

/**
 * Get video by ID
 */
export const getVideoById = async (id) => {
    return prisma.media.findUnique({
        where: { id },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            storageKey: true,
            url: true,
            uploadedBy: true,
            entityType: true,
            entityId: true,
            thumbnailUrl: true,
            originalSize: true,
            compressionRatio: true,
            isCompressed: true,
            createdAt: true
        }
    });
};

/**
 * Get all videos
 */
export const getAllVideos = async (limit = 50, offset = 0) => {
    return prisma.media.findMany({
        where: {
            mimeType: { startsWith: 'video/' }
        },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            url: true,
            uploadedBy: true,
            entityType: true,
            entityId: true,
            thumbnailUrl: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Get videos for specific entity (lesson, course, etc)
 */
export const getVideosByEntity = async (entityType, entityId) => {
    return prisma.media.findMany({
        where: {
            entityType,
            entityId,
            mimeType: { startsWith: 'video/' }
        },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            url: true,
            thumbnailUrl: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Get video count
 */
export const getVideoCount = async () => {
    return prisma.media.count({
        where: { mimeType: { startsWith: 'video/' } }
    });
};

/**
 * Update video record
 */
export const updateVideoRecord = async (id, data) => {
    return prisma.media.update({
        where: { id },
        data
    });
};

/**
 * Delete video record and file
 */
export const deleteVideoRecord = async (id) => {
    const video = await getVideoById(id);

    if (!video) {
        throw new Error('Video not found');
    }

    // Delete file from disk
    if (video.storageKey) {
        await deleteVideoFile(video.storageKey);
    }

    // Delete from database
    return prisma.media.delete({
        where: { id }
    });
};

/**
 * Link video to an entity
 */
export const linkVideoToEntity = async (videoId, entityType, entityId) => {
    return prisma.media.update({
        where: { id: videoId },
        data: {
            entityType,
            entityId
        }
    });
};

/**
 * Get total storage used by videos
 */
export const getTotalVideoStorage = async () => {
    const result = await prisma.media.aggregate({
        where: { mimeType: { startsWith: 'video/' } },
        _sum: { size: true }
    });

    return result._sum.size || 0;
};

export default {
    createVideoRecord,
    getVideoById,
    getAllVideos,
    getVideosByEntity,
    getVideoCount,
    updateVideoRecord,
    deleteVideoRecord,
    linkVideoToEntity,
    getTotalVideoStorage
};
