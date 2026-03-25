import prisma from "../config/db.js";
import { getMediaById } from "../models/mediaModel.js";
import { getEnrollment } from "../models/courseModel.js";

/**
 * Enhanced Media Authorization Middleware
 * Implements Role-Based Access Control and Entity-Based Authorization
 */
const mediaAuthMiddleware = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const mediaId = parseInt(req.params.id);

        if (!userId || !mediaId) {
            return res.status(400).json({ message: "Invalid request" });
        }

        // Get media information
        const media = await getMediaById(mediaId);
        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        // Get user information
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, isAdmin: true, name: true }
        });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // ADMIN ACCESS: Admins can access all content
        if (user.isAdmin) {
            req.media = media;
            req.accessType = 'admin';
            return next();
        }

        // ENTITY-BASED AUTHORIZATION: Check if media is linked to specific entities
        if (media.entityType && media.entityId) {
            const authorized = await checkEntityAuthorization(userId, media.entityType, media.entityId);

            if (!authorized) {
                return res.status(403).json({
                    message: "Access denied. You don't have permission to access this content.",
                    entityType: media.entityType,
                    entityId: media.entityId
                });
            }

            // CHECK PREMIUM CONTENT: Verify premium access if needed
            if (media.entityType === 'course') {
                const courseAccess = await checkCourseAccess(userId, media.entityId);
                if (!courseAccess.allowed) {
                    return res.status(403).json({
                        message: courseAccess.reason,
                        requiresPremium: courseAccess.requiresPremium
                    });
                }
            }
        }
        // OWNERSHIP VALIDATION: User can access their own uploaded content
        else if (media.uploadedBy === userId) {
            req.accessType = 'owner';
        }
        // PUBLIC CONTENT: No entity association and not owned by user
        else {
            return res.status(403).json({
                message: "Access denied. This content is not publicly accessible."
            });
        }

        req.media = media;
        req.accessType = 'authorized';
        next();

    } catch (error) {
        console.error("Media authorization error:", error);
        res.status(500).json({ message: "Authorization check failed" });
    }
};

/**
 * Check if user has access to specific entity content
 */
async function checkEntityAuthorization(userId, entityType, entityId) {
    switch (entityType) {
        case 'course':
            return await checkCourseEnrollment(userId, entityId);

        case 'lesson':
            return await checkLessonAccess(userId, entityId);

        case 'tool':
            return await checkToolAccess(userId, entityId);

        default:
            // For unknown entity types, deny access
            return false;
    }
}

/**
 * Check if user is enrolled in course
 */
async function checkCourseEnrollment(userId, courseId) {
    const enrollment = await getEnrollment(userId, courseId);
    return !!enrollment;
}

/**
 * Check if user has access to lesson (via course enrollment)
 */
async function checkLessonAccess(userId, lessonId) {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { courseId: true }
    });

    if (!lesson) return false;

    return await checkCourseEnrollment(userId, lesson.courseId);
}

/**
 * Check if user has access to tool content (via course enrollment)
 */
async function checkToolAccess(userId, toolId) {
    // Check if user has access to any course that includes this tool
    const toolCourses = await prisma.toolCourse.findMany({
        where: { toolId },
        select: { courseId: true }
    });

    for (const toolCourse of toolCourses) {
        const hasAccess = await checkCourseEnrollment(userId, toolCourse.courseId);
        if (hasAccess) return true;
    }

    return false;
}

/**
 * Check premium course access and tool restrictions
 */
async function checkCourseAccess(userId, courseId) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            toolCourses: {
                include: {
                    tool: {
                        select: { isPremium: true }
                    }
                }
            }
        }
    });

    if (!course) {
        return { allowed: false, reason: "Course not found" };
    }

    // Check if this course contains premium tools
    const hasPremiumTools = course.toolCourses.some(tc => tc.tool.isPremium);

    if (hasPremiumTools) {
        // In a real app, you'd check user's subscription status
        // For now, we'll assume all users have premium access
        // TODO: Implement actual premium subscription check

        // Example premium check (commented out):
        // const userSubscription = await checkUserSubscription(userId);
        // if (!userSubscription.isPremium) {
        //     return {
        //         allowed: false,
        //         reason: "Premium subscription required for this content",
        //         requiresPremium: true
        //     };
        // }
    }

    return { allowed: true };
}

export default mediaAuthMiddleware;