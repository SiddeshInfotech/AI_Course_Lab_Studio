import express from 'express';
import multer from 'multer';
import {
    uploadVideo,
    getVideo,
    streamVideo,
    listVideos,
    getVideosByEntityHandler,
    deleteVideo,
    linkVideo,
    getCourses,
    getLessonsForCourse
} from '../controllers/videoControllerNew.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// Configure multer for video uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-ms-wmv'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid video format. Supported: MP4, WebM, OGG, QuickTime, AVI, WMV'));
        }
    }
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'File too large. Maximum size is 500MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Public routes
// Note: More specific routes must come before generic routes like /:id
router.get('/courses', getCourses);
router.get('/courses/:courseId/lessons', getLessonsForCourse);
router.get('/:id', getVideo);
router.get('/:id/stream', streamVideo);
router.get('/entity/:entityType/:entityId', getVideosByEntityHandler);

// Protected admin routes
router.post('/upload', authMiddleware, adminMiddleware, (req, res, next) => {
    upload.single('video')(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
    });
}, uploadVideo);

router.get('/', authMiddleware, adminMiddleware, listVideos);
router.delete('/:id', authMiddleware, adminMiddleware, deleteVideo);
router.post('/:id/link', authMiddleware, adminMiddleware, linkVideo);

export default router;
