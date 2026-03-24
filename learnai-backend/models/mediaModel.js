import prisma from "../config/db.js";

// Create a media record with file data
export const createMedia = async (
    file,
    uploadedBy,
    entityType = null,
    entityId = null,
    customFilename = null
) => {
    return prisma.media.create({
        data: {
            filename: customFilename || file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            data: file.buffer,
            uploadedBy,
            entityType,
            entityId,
        },
    });
};

// Get media by ID (without data for listing)
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
            createdAt: true,
        },
    });

// Get media with data (for streaming/download)
export const getMediaWithData = (id) =>
    prisma.media.findUnique({
        where: { id },
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
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

// List all media (for admin)
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

// Get storage used (sum of all file sizes)
export const getStorageUsed = async () => {
    const result = await prisma.media.aggregate({
        _sum: { size: true },
    });
    return result._sum.size || 0;
};
