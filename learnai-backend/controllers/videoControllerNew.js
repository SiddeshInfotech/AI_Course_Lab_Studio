import {
    createVideoRecord,
    getVideoById,
    getAllVideos,
    getVideosByEntity,
    getVideoCount,
    deleteVideoRecord,
    linkVideoToEntity,
    getTotalVideoStorage
} from '../models/videoModel.js';
import {
    generateVideoFilename,
    saveVideoFile,
    getVideoStream,
    getVideoStats
} from '../services/videoService.js';

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv'
];

/**
 * Upload a video file
 * POST /api/videos/upload
 */
export const uploadVideo = async (req, res) => {
    try {
        const prisma = (await import('../config/db.js')).default;

        // Validate file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        const file = req.file;

        // Validate file size
        if (file.size > MAX_VIDEO_SIZE) {
            return res.status(413).json({
                success: false,
                message: `File too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`,
                maxSize: MAX_VIDEO_SIZE
            });
        }

        // Validate file type
        if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid video format',
                allowedTypes: ALLOWED_VIDEO_TYPES
            });
        }

        // Extract entity information from formData (multipart)
        const { lessonId, courseId, title, quizContent } = req.body;
        const userId = req.user?.id || req.user?.userId;

        // Determine entityType and entityId based on what was provided
        let entityType = null;
        let entityId = null;

        if (lessonId) {
            entityType = 'lesson';
            entityId = parseInt(lessonId);
        } else if (courseId) {
            entityType = 'course';
            entityId = parseInt(courseId);
        }

        // Generate unique filename
        const filename = generateVideoFilename(file.originalname);

        console.log(`📤 Uploading video: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        console.log(`📋 Entity Info - Type: ${entityType}, ID: ${entityId}`);
        if (quizContent) {
            console.log(`📝 Quiz content included: ${quizContent.length} characters`);
        }

        // Save file to disk
        const savedVideo = await saveVideoFile(file.buffer, filename);

        // Create database record
        const videoRecord = await createVideoRecord({
            filename: file.originalname,
            mimeType: file.mimetype,
            size: savedVideo.size,
            storageKey: filename,
            url: savedVideo.url,
            uploadedBy: userId,
            entityType: entityType || null,
            entityId: entityId ? parseInt(entityId) : null,
            thumbnailUrl: `${process.env.STATIC_URL || 'http://localhost:5001'}/uploads/videos/placeholder.png`
        });

        // If uploading to a lesson, update the lesson's videoUrl and optionally quizContent
        if (entityType === 'lesson' && entityId) {
            try {
                const updateData = {
                    videoUrl: savedVideo.url
                };

                // Add quiz content if provided
                if (quizContent) {
                    try {
                        // Validate quiz JSON
                        JSON.parse(quizContent);
                        updateData.content = quizContent;
                        console.log(`✅ Quiz content will be saved to lesson`);
                    } catch (jsonError) {
                        console.warn(`⚠️ Invalid quiz JSON: ${jsonError.message}`);
                        // Don't fail the upload if JSON is invalid, just skip quiz content
                    }
                }

                await prisma.lesson.update({
                    where: { id: parseInt(entityId) },
                    data: updateData
                });
                console.log(`✅ Updated lesson ${entityId} with videoUrl and ${quizContent ? 'quiz content' : 'no quiz'}`);
            } catch (lessonError) {
                console.warn(`⚠️ Failed to update lesson: ${lessonError.message}`);
                // Don't fail the entire upload if lesson update fails
            }
        }

        console.log(`✅ Video uploaded successfully: ${filename}`);

        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                id: videoRecord.id,
                type: 'uploaded',
                title: videoRecord.filename,
                filename: videoRecord.filename,
                mimeType: videoRecord.mimeType,
                size: videoRecord.size,
                originalSize: videoRecord.originalSize || videoRecord.size,
                compressionRatio: videoRecord.compressionRatio || 1,
                isCompressed: videoRecord.isCompressed || false,
                processingTime: 0,
                url: videoRecord.url,
                thumbnailUrl: videoRecord.thumbnailUrl,
                entityType: videoRecord.entityType,
                entityId: videoRecord.entityId,
                createdAt: videoRecord.createdAt,
                lesson: null,
                course: null,
                quizContent: quizContent ? 'saved' : null
            }
        });
    } catch (error) {
        console.error('❌ Video upload error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to upload video',
            error: error.message
        });
    }
};

/**
 * Get video by ID
 * GET /api/videos/:id
 */
export const getVideo = async (req, res) => {
    try {
        const { id } = req.params;

        const video = await getVideoById(parseInt(id));

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        res.json({
            success: true,
            data: video
        });
    } catch (error) {
        console.error('❌ Get video error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get video',
            error: error.message
        });
    }
};

/**
 * Stream video file
 * GET /api/videos/:id/stream
 */
export const streamVideo = async (req, res) => {
    try {
        const { id } = req.params;

        const video = await getVideoById(parseInt(id));

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Get video stats
        const stats = await getVideoStats(video.storageKey);

        // Set headers
        const range = req.headers.range;
        const fileSize = stats.size;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunksize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': video.mimeType
            });
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': video.mimeType
            });
        }

        // Stream the file
        const stream = await getVideoStream(video.storageKey);
        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            res.status(500).end();
        });
    } catch (error) {
        console.error('❌ Stream video error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to stream video',
            error: error.message
        });
    }
};

/**
 * List all videos
 * GET /api/videos
 */
export const listVideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        const [videos, total, totalStorage] = await Promise.all([
            getAllVideos(limit, offset),
            getVideoCount(),
            getTotalVideoStorage()
        ]);

        // Transform videos to match frontend format
        const formattedVideos = videos.map(video => ({
            id: video.id,
            type: 'uploaded',
            title: video.filename,
            mimeType: video.mimeType,
            size: video.size,
            originalSize: video.originalSize || video.size,
            compressionRatio: video.compressionRatio || 1,
            isCompressed: video.isCompressed || false,
            processingTime: 0,
            url: video.url,
            thumbnailUrl: video.thumbnailUrl,
            createdAt: video.createdAt,
            lesson: null,
            course: null
        }));

        // Calculate statistics
        const videoOriginalSize = videos.reduce((sum, v) => sum + (v.originalSize || 0), 0);
        const videoStorageUsed = videos.reduce((sum, v) => sum + (v.size || 0), 0);
        const avgCompressionRatio = videos.length > 0
            ? videos.reduce((sum, v) => sum + (v.compressionRatio || 1), 0) / videos.length
            : 1;

        res.json({
            success: true,
            videos: formattedVideos,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalVideos: total,
                videosPerPage: limit
            },
            stats: {
                uploadedVideos: total,
                externalVideos: 0,
                totalVideos: total,
                storageUsed: totalStorage,
                originalStorageSize: videoOriginalSize,
                spaceSaved: Math.max(0, videoOriginalSize - videoStorageUsed),
                compressionRatio: avgCompressionRatio,
                videoStorageUsed,
                videoOriginalSize,
                videoSpaceSaved: Math.max(0, videoOriginalSize - videoStorageUsed),
                avgCompressionRatio,
                avgProcessingTime: 0
            }
        });
    } catch (error) {
        console.error('❌ List videos error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to list videos',
            error: error.message
        });
    }
};

/**
 * Get videos by entity
 * GET /api/videos/entity/:entityType/:entityId
 */
export const getVideosByEntityHandler = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;

        const videos = await getVideosByEntity(entityType, parseInt(entityId));

        res.json({
            success: true,
            data: videos
        });
    } catch (error) {
        console.error('❌ Get videos by entity error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get videos',
            error: error.message
        });
    }
};

/**
 * Delete video
 * DELETE /api/videos/:id
 */
export const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;

        const video = await getVideoById(parseInt(id));

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        await deleteVideoRecord(parseInt(id));

        console.log(`✅ Video deleted: ${video.storageKey}`);

        res.json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete video error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete video',
            error: error.message
        });
    }
};

/**
 * Link video to entity
 * POST /api/videos/:id/link
 */
export const linkVideo = async (req, res) => {
    try {
        const prisma = (await import('../config/db.js')).default;
        const { id } = req.params;
        const { entityType, entityId } = req.body;

        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'entityType and entityId are required'
            });
        }

        const video = await getVideoById(parseInt(id));

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Link video in Media table
        await linkVideoToEntity(parseInt(id), entityType, parseInt(entityId));

        // If linking to a lesson, also update the lesson's videoUrl
        if (entityType === 'lesson') {
            await prisma.lesson.update({
                where: { id: parseInt(entityId) },
                data: {
                    videoUrl: video.url  // Set lesson's videoUrl to the video's direct URL
                }
            });
            console.log(`✅ Updated lesson ${entityId} videoUrl to: ${video.url}`);
        }

        res.json({
            success: true,
            message: 'Video linked successfully',
            video: {
                id: video.id,
                url: video.url,
                title: video.filename
            }
        });
    } catch (error) {
        console.error('❌ Link video error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to link video',
            error: error.message
        });
    }
};

/**
 * Get all courses with lesson counts
 * GET /api/videos/courses
 */
export const getCourses = async (req, res) => {
    try {
        const prisma = (await import('../config/db.js')).default;

        const courses = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                category: true,
                level: true,
                _count: {
                    select: {
                        lessons: true
                    }
                }
            },
            orderBy: { title: 'asc' }
        });

        const formattedCourses = courses.map(course => ({
            id: course.id,
            title: course.title,
            category: course.category,
            level: course.level,
            lessonCount: course._count.lessons
        }));

        res.json({
            success: true,
            courses: formattedCourses
        });
    } catch (error) {
        console.error('❌ Get courses error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get courses',
            error: error.message
        });
    }
};

/**
 * Get lessons for a specific course
 * GET /api/videos/courses/:courseId/lessons
 */
export const getLessonsForCourse = async (req, res) => {
    try {
        const prisma = (await import('../config/db.js')).default;
        const { courseId } = req.params;

        const course = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            select: {
                id: true,
                title: true
            }
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const lessons = await prisma.lesson.findMany({
            where: { courseId: parseInt(courseId) },
            select: {
                id: true,
                title: true,
                orderIndex: true,
                duration: true,
                videoUrl: true
            },
            orderBy: { orderIndex: 'asc' }
        });

        res.json({
            success: true,
            course: {
                id: course.id,
                title: course.title
            },
            lessons: lessons.map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                orderIndex: lesson.orderIndex,
                duration: lesson.duration,
                hasVideo: !!lesson.videoUrl,
                videoType: lesson.videoUrl ? (lesson.videoUrl.startsWith('http') ? 'external' : 'uploaded') : null
            }))
        });
    } catch (error) {
        console.error('❌ Get lessons error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get lessons',
            error: error.message
        });
    }
};

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    uploadVideo,
    getVideo,
    streamVideo,
    listVideos,
    getVideosByEntityHandler,
    deleteVideo,
    linkVideo,
    getCourses,
    getLessonsForCourse
};
