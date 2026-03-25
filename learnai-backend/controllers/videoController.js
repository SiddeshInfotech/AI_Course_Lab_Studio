import {
    getAllCourses,
    getCourseById,
    getLessonsByCourse,
    getLessonById,
    updateLesson,
} from "../models/courseModel.js";
import {
    createMedia,
    getMediaById,
    getMediaByEntity,
    getAllMedia,
    deleteMedia,
    getVideoMedia,
    getMediaThumbnail,
    getStorageStats,
    getVideoCount,
} from "../models/mediaModel.js";
import prisma from "../config/db.js";
import {
    initializeChunkedUpload,
    uploadChunk,
    assembleChunks,
    getUploadStatus,
    cancelUploadSession,
} from "../utils/chunkedUpload.js";

// Max video file size: 500MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

// Allowed video MIME types
const ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo", // .avi
    "video/x-ms-wmv"   // .wmv
];

// Helper function for URL validation
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// GET /api/admin/videos — get all videos with course/lesson info (optimized)
export const getAllVideos = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            courseId,
            lessonId,
            type = 'all' // 'uploaded', 'external', 'all'
        } = req.query;

        const offset = (page - 1) * limit;

        // Get uploaded videos from media table using optimized query
        let uploadedVideos = [];
        if (type === 'uploaded' || type === 'all') {
            const mediaVideos = await getVideoMedia(parseInt(limit), offset, courseId);

            // Get lesson and course info for each video (parallel processing for better performance)
            uploadedVideos = await Promise.all(
                mediaVideos.map(async (video) => {
                    let lesson = null;
                    let course = null;

                    if (video.entityType === 'lesson' && video.entityId) {
                        try {
                            [lesson, course] = await Promise.all([
                                getLessonById(video.entityId),
                                video.entityId ? getLessonById(video.entityId).then(l => l ? getCourseById(l.courseId) : null) : null
                            ]);
                        } catch (err) {
                            console.warn(`Could not fetch lesson/course for video ${video.id}`);
                        }
                    }

                    return {
                        id: video.id,
                        type: 'uploaded',
                        title: video.filename,
                        mimeType: video.mimeType,
                        size: video.size,
                        originalSize: video.originalSize,
                        compressionRatio: video.compressionRatio,
                        isCompressed: video.isCompressed,
                        processingTime: video.processingTime,
                        url: `/api/media/${video.id}`,
                        thumbnailUrl: `/api/admin/videos/${video.id}/thumbnail`,
                        createdAt: video.createdAt,
                        lesson,
                        course,
                    };
                })
            );
        }

        // Get external video URLs from lessons (optimized query)
        let externalVideos = [];
        if (type === 'external' || type === 'all') {
            const lessonsWithVideos = await prisma.lesson.findMany({
                where: {
                    videoUrl: { not: null },
                    ...(courseId && { courseId: parseInt(courseId) }),
                    ...(lessonId && { id: parseInt(lessonId) }),
                },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            level: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: type === 'external' ? parseInt(limit) : undefined,
                skip: type === 'external' ? offset : 0,
            });

            externalVideos = lessonsWithVideos.map((lesson) => ({
                id: `external_${lesson.id}`,
                type: 'external',
                title: `${lesson.title} - External Video`,
                url: lesson.videoUrl,
                thumbnailUrl: null, // External videos don't have thumbnails
                createdAt: lesson.createdAt,
                lesson: {
                    id: lesson.id,
                    title: lesson.title,
                    orderIndex: lesson.orderIndex,
                    courseId: lesson.courseId,
                },
                course: lesson.course,
            }));
        }

        // Combine and sort all videos
        const allVideos = [...uploadedVideos, ...externalVideos]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply pagination for combined results
        const paginatedVideos = type === 'all'
            ? allVideos.slice(offset, offset + parseInt(limit))
            : allVideos;

        // Get total counts and storage stats (parallel for performance)
        const [uploadedCount, externalCount, storageStats] = await Promise.all([
            getVideoCount(),
            prisma.lesson.count({
                where: { videoUrl: { not: null } }
            }),
            getStorageStats()
        ]);

        const totalCount = type === 'uploaded' ? uploadedCount :
            type === 'external' ? externalCount :
                uploadedCount + externalCount;

        res.json({
            success: true,
            videos: paginatedVideos,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                totalVideos: totalCount,
                videosPerPage: parseInt(limit),
            },
            stats: {
                uploadedVideos: uploadedCount,
                externalVideos: externalCount,
                totalVideos: uploadedCount + externalCount,

                // Enhanced storage statistics
                storageUsed: storageStats.totalStorageUsed,
                originalStorageSize: storageStats.totalOriginalSize,
                spaceSaved: storageStats.totalSpaceSaved,
                compressionRatio: storageStats.overallCompressionRatio,

                // Video-specific stats
                videoStorageUsed: storageStats.videoStorageUsed,
                videoOriginalSize: storageStats.videoOriginalSize,
                videoSpaceSaved: storageStats.videoSpaceSaved,
                avgCompressionRatio: storageStats.avgCompressionRatio,
                avgProcessingTime: storageStats.avgProcessingTime,
            }
        });
    } catch (error) {
        console.error("Get all videos error:", error);
        res.status(500).json({ message: "Failed to get videos" });
    }
};

// POST /api/admin/videos/upload — upload video and link to lesson
export const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No video file provided" });
        }

        const file = req.file;
        const { courseId, lessonId, title, replaceExisting = false } = req.body;

        // Validate file size
        if (file.size > MAX_VIDEO_SIZE) {
            return res.status(400).json({
                message: `Video file too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`,
            });
        }

        // Validate MIME type
        if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            return res.status(400).json({
                message: "Invalid video format",
                allowedTypes: ALLOWED_VIDEO_TYPES,
            });
        }

        // Validate course and lesson if provided
        let course = null;
        let lesson = null;

        if (courseId) {
            course = await getCourseById(parseInt(courseId));
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }
        }

        if (lessonId) {
            lesson = await getLessonById(parseInt(lessonId));
            if (!lesson) {
                return res.status(404).json({ message: "Lesson not found" });
            }

            // Verify lesson belongs to course if both are specified
            if (courseId && lesson.courseId !== parseInt(courseId)) {
                return res.status(400).json({ message: "Lesson does not belong to the specified course" });
            }

            course = await getCourseById(lesson.courseId);
        }

        // Create final filename
        const videoTitle = title?.trim() ||
            (lesson ? `${course.title} - ${lesson.title}` : file.originalname);
        const extensionFromName = file.originalname.includes(".")
            ? file.originalname.substring(file.originalname.lastIndexOf("."))
            : "";
        const sanitizedTitle = videoTitle.replace(/[\\/:*?"<>|]/g, "");
        const finalFilename = `${sanitizedTitle}${extensionFromName}`;

        // Upload video to media table
        const media = await createMedia(
            file,
            req.user.userId,
            lesson ? 'lesson' : null,
            lesson ? lesson.id : null,
            finalFilename
        );

        // If lesson is specified, ALWAYS update lesson's videoUrl
        // This ensures students can access the video immediately
        if (lesson) {
            await updateLesson(lesson.id, {
                videoUrl: `/api/media/${media.id}`,
            });
        }

        res.status(201).json({
            success: true,
            video: {
                id: media.id,
                type: 'uploaded',
                filename: media.filename,
                mimeType: media.mimeType,
                size: media.size,
                originalSize: media.originalSize,
                compressionRatio: media.compressionRatio,
                isCompressed: media.isCompressed,
                processingTime: media.processingTime,
                url: `/api/media/${media.id}`,
                thumbnailUrl: `/api/admin/videos/${media.id}/thumbnail`,
                createdAt: media.createdAt,
                lesson,
                course,
            },
            message: lesson
                ? `Video uploaded and ${replaceExisting ? 'linked to' : 'associated with'} lesson "${lesson.title}"`
                : "Video uploaded successfully",
            optimization: {
                originalSizeMB: Math.round(media.originalSize / (1024 * 1024)),
                compressedSizeMB: Math.round(media.size / (1024 * 1024)),
                spaceSavedMB: Math.round((media.originalSize - media.size) / (1024 * 1024)),
                compressionRatio: Math.round(media.compressionRatio * 100),
                processingTime: media.processingTime,
            }
        });
    } catch (error) {
        console.error("Upload video error:", error);
        res.status(500).json({ message: "Failed to upload video" });
    }
};

// POST /api/admin/videos/external — add external video URL to lesson
export const addExternalVideo = async (req, res) => {
    try {
        const { courseId, lessonId, videoUrl, title, description } = req.body;

        // Validate required fields
        if (!lessonId || !videoUrl) {
            return res.status(400).json({
                message: "Lesson ID and video URL are required"
            });
        }

        // Validate URL format
        if (!isValidUrl(videoUrl)) {
            return res.status(400).json({ message: "Invalid video URL format" });
        }

        // Validate lesson exists
        const lesson = await getLessonById(parseInt(lessonId));
        if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
        }

        // Get course info
        const course = await getCourseById(lesson.courseId);

        // Verify course matches if provided
        if (courseId && lesson.courseId !== parseInt(courseId)) {
            return res.status(400).json({
                message: "Lesson does not belong to the specified course"
            });
        }

        // Update lesson with video URL
        const updateData = { videoUrl };
        if (title) updateData.title = title.trim();
        if (description) updateData.description = description.trim();

        const updatedLesson = await updateLesson(lesson.id, updateData);

        res.status(201).json({
            success: true,
            video: {
                id: `external_${lesson.id}`,
                type: 'external',
                title: updatedLesson.title,
                url: videoUrl,
                lesson: updatedLesson,
                course,
            },
            message: `External video linked to lesson "${updatedLesson.title}"`
        });
    } catch (error) {
        console.error("Add external video error:", error);
        res.status(500).json({ message: "Failed to add external video" });
    }
};

// DELETE /api/admin/videos/:id — delete video
export const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // 'uploaded' or 'external'

        if (type === 'external') {
            // Handle external video (remove from lesson)
            const lessonId = id.replace('external_', '');
            const lesson = await getLessonById(parseInt(lessonId));

            if (!lesson) {
                return res.status(404).json({ message: "Lesson not found" });
            }

            await updateLesson(lesson.id, { videoUrl: null });

            res.json({
                success: true,
                message: `External video removed from lesson "${lesson.title}"`
            });
        } else {
            // Handle uploaded video (delete from media table)
            const mediaId = parseInt(id);
            const media = await getMediaById(mediaId);

            if (!media) {
                return res.status(404).json({ message: "Video not found" });
            }

            // Check if video is linked to any lessons
            const linkedLessons = await prisma.lesson.findMany({
                where: { videoUrl: `/api/media/${mediaId}` },
                include: { course: { select: { title: true } } }
            });

            await deleteMedia(mediaId);

            res.json({
                success: true,
                message: "Video deleted successfully",
                linkedLessons: linkedLessons.length > 0
                    ? `Warning: This video was linked to ${linkedLessons.length} lesson(s)`
                    : null
            });
        }
    } catch (error) {
        console.error("Delete video error:", error);
        res.status(500).json({ message: "Failed to delete video" });
    }
};

// GET /api/admin/videos/courses — get courses for dropdown
export const getCoursesForVideo = async (req, res) => {
    try {
        const courses = await getAllCourses();

        const courseOptions = courses.map(course => ({
            id: course.id,
            title: course.title,
            category: course.category,
            level: course.level,
            lessonCount: 0, // Will be filled by frontend when needed
        }));

        res.json({
            success: true,
            courses: courseOptions
        });
    } catch (error) {
        console.error("Get courses for video error:", error);
        res.status(500).json({ message: "Failed to get courses" });
    }
};

// GET /api/admin/videos/courses/:courseId/lessons — get lessons for a course
export const getLessonsForVideo = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);

        if (isNaN(courseId)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        const course = await getCourseById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const lessons = await getLessonsByCourse(courseId);

        const lessonOptions = lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            orderIndex: lesson.orderIndex,
            duration: lesson.duration,
            hasVideo: !!lesson.videoUrl,
            videoType: lesson.videoUrl?.startsWith('/api/media/') ? 'uploaded' : 'external',
        }));

        res.json({
            success: true,
            course: {
                id: course.id,
                title: course.title,
            },
            lessons: lessonOptions
        });
    } catch (error) {
        console.error("Get lessons for video error:", error);
        res.status(500).json({ message: "Failed to get lessons" });
    }
};

// PUT /api/admin/videos/:id/link — link existing video to lesson
export const linkVideoToLesson = async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const { lessonId, replaceExisting = false } = req.body;

        if (!lessonId) {
            return res.status(400).json({ message: "Lesson ID is required" });
        }

        // Validate video exists
        const media = await getMediaById(videoId);
        if (!media) {
            return res.status(404).json({ message: "Video not found" });
        }

        // Validate lesson exists
        const lesson = await getLessonById(parseInt(lessonId));
        if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
        }

        // Check if lesson already has a video
        if (lesson.videoUrl && !replaceExisting) {
            return res.status(400).json({
                message: "Lesson already has a video. Set replaceExisting=true to replace it.",
                currentVideo: lesson.videoUrl
            });
        }

        // Update lesson with video URL
        await updateLesson(lesson.id, {
            videoUrl: `/api/media/${videoId}`,
        });

        // Update media entity link
        await prisma.media.update({
            where: { id: videoId },
            data: {
                entityType: 'lesson',
                entityId: lesson.id,
            }
        });

        const course = await getCourseById(lesson.courseId);

        res.json({
            success: true,
            message: `Video linked to lesson "${lesson.title}"`,
            video: {
                id: media.id,
                filename: media.filename,
                url: `/api/media/${media.id}`,
                thumbnailUrl: `/api/admin/videos/${media.id}/thumbnail`,
                lesson,
                course,
            }
        });
    } catch (error) {
        console.error("Link video to lesson error:", error);
        res.status(500).json({ message: "Failed to link video to lesson" });
    }
};

// GET /api/admin/videos/:id/thumbnail — serve video thumbnail
export const getVideoThumbnail = async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);

        if (isNaN(videoId)) {
            return res.status(400).json({ message: "Invalid video ID" });
        }

        const media = await getMediaThumbnail(videoId);

        if (!media || !media.thumbnail) {
            return res.status(404).json({ message: "Thumbnail not found" });
        }

        // Set appropriate headers for image
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': media.thumbnail.length,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'ETag': `"thumbnail-${videoId}"`,
        });

        res.send(media.thumbnail);
    } catch (error) {
        console.error("Get video thumbnail error:", error);
        res.status(500).json({ message: "Failed to get video thumbnail" });
    }
};

// CHUNKED UPLOAD ENDPOINTS

// POST /api/admin/videos/chunk/init — initialize chunked upload
export const initChunkedUpload = async (req, res) => {
    try {
        const { filename, mimeType, totalSize } = req.body;

        // Validate file info
        if (!filename || !mimeType || !totalSize) {
            return res.status(400).json({
                message: "Missing required fields: filename, mimeType, totalSize"
            });
        }

        // Validate file size
        if (totalSize > MAX_VIDEO_SIZE) {
            return res.status(400).json({
                message: `Video file too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`,
            });
        }

        // Validate MIME type
        if (!ALLOWED_VIDEO_TYPES.includes(mimeType)) {
            return res.status(400).json({
                message: "Invalid video format",
                allowedTypes: ALLOWED_VIDEO_TYPES,
            });
        }

        const uploadInfo = initializeChunkedUpload({ filename, mimeType, totalSize });

        res.json({
            success: true,
            upload: uploadInfo,
            message: "Chunked upload initialized"
        });
    } catch (error) {
        console.error("Init chunked upload error:", error);
        res.status(500).json({ message: "Failed to initialize chunked upload" });
    }
};

// POST /api/admin/videos/chunk/:sessionId/:chunkIndex — upload individual chunk
export const uploadVideoChunk = async (req, res) => {
    try {
        const { sessionId, chunkIndex } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No chunk data provided" });
        }

        const chunkIndexNum = parseInt(chunkIndex);
        if (isNaN(chunkIndexNum)) {
            return res.status(400).json({ message: "Invalid chunk index" });
        }

        const result = await uploadChunk(sessionId, chunkIndexNum, req.file.buffer);

        res.json({
            success: true,
            chunk: result,
            message: `Chunk ${chunkIndexNum} uploaded successfully`
        });
    } catch (error) {
        console.error("Upload chunk error:", error);
        res.status(400).json({
            message: error.message || "Failed to upload chunk"
        });
    }
};

// POST /api/admin/videos/chunk/:sessionId/complete — complete chunked upload
export const completeChunkedUpload = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { courseId, lessonId, title, replaceExisting = false } = req.body;

        // Assemble chunks into final file
        const fileObject = await assembleChunks(sessionId);

        // Process the assembled file same as regular upload
        let course = null;
        let lesson = null;

        if (courseId) {
            course = await getCourseById(parseInt(courseId));
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }
        }

        if (lessonId) {
            lesson = await getLessonById(parseInt(lessonId));
            if (!lesson) {
                return res.status(404).json({ message: "Lesson not found" });
            }

            if (courseId && lesson.courseId !== parseInt(courseId)) {
                return res.status(400).json({
                    message: "Lesson does not belong to the specified course"
                });
            }

            course = await getCourseById(lesson.courseId);
        }

        // Create final filename
        const videoTitle = title?.trim() ||
            (lesson ? `${course.title} - ${lesson.title}` : fileObject.originalname);
        const extensionFromName = fileObject.originalname.includes(".")
            ? fileObject.originalname.substring(fileObject.originalname.lastIndexOf("."))
            : "";
        const sanitizedTitle = videoTitle.replace(/[\\/:*?"<>|]/g, "");
        const finalFilename = `${sanitizedTitle}${extensionFromName}`;

        // Upload video to media table
        const media = await createMedia(
            fileObject,
            req.user.userId,
            lesson ? 'lesson' : null,
            lesson ? lesson.id : null,
            finalFilename
        );

        // If lesson is specified, ALWAYS update lesson's videoUrl
        // This ensures students can access the video immediately
        if (lesson) {
            await updateLesson(lesson.id, {
                videoUrl: `/api/media/${media.id}`,
            });
        }

        res.status(201).json({
            success: true,
            video: {
                id: media.id,
                type: 'uploaded',
                filename: media.filename,
                mimeType: media.mimeType,
                size: media.size,
                originalSize: media.originalSize,
                compressionRatio: media.compressionRatio,
                isCompressed: media.isCompressed,
                processingTime: media.processingTime,
                url: `/api/media/${media.id}`,
                thumbnailUrl: `/api/admin/videos/${media.id}/thumbnail`,
                createdAt: media.createdAt,
                lesson,
                course,
            },
            message: lesson
                ? `Chunked video uploaded and ${replaceExisting ? 'linked to' : 'associated with'} lesson "${lesson.title}"`
                : "Chunked video uploaded successfully",
            optimization: {
                originalSizeMB: Math.round(media.originalSize / (1024 * 1024)),
                compressedSizeMB: Math.round(media.size / (1024 * 1024)),
                spaceSavedMB: Math.round((media.originalSize - media.size) / (1024 * 1024)),
                compressionRatio: Math.round(media.compressionRatio * 100),
                processingTime: media.processingTime,
            }
        });
    } catch (error) {
        console.error("Complete chunked upload error:", error);
        res.status(500).json({ message: "Failed to complete chunked upload" });
    }
};

// GET /api/admin/videos/chunk/:sessionId/status — get upload status
export const getChunkedUploadStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const status = getUploadStatus(sessionId);

        if (!status) {
            return res.status(404).json({ message: "Upload session not found" });
        }

        res.json({
            success: true,
            status
        });
    } catch (error) {
        console.error("Get chunked upload status error:", error);
        res.status(500).json({ message: "Failed to get upload status" });
    }
};

// DELETE /api/admin/videos/chunk/:sessionId — cancel chunked upload
export const cancelChunkedUpload = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await cancelUploadSession(sessionId);

        res.json({
            success: true,
            result,
            message: "Upload session cancelled"
        });
    } catch (error) {
        console.error("Cancel chunked upload error:", error);
        res.status(500).json({ message: "Failed to cancel upload session" });
    }
};