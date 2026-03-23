import express from "express";
import multer from "multer";
import {
    dashboard,
    listUsers,
    getUser,
    addUser,
    toggleAdmin,
    removeUser,
} from "../controllers/adminController.js";
import {
    listCourses,
    addCourse,
    editCourse,
    removeCourse,
    listLessons,
    addLesson,
    editLesson,
    removeLesson,
} from "../controllers/courseController.js";
import {
    uploadFile,
    uploadMultipleFiles,
    listMedia,
    getMediaInfo,
    removeMedia,
    assignMedia,
    getEntityMedia,
} from "../controllers/uploadController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

// All admin routes require authentication + admin check
router.use(authMiddleware, adminMiddleware);

// Dashboard
router.get("/dashboard", dashboard);

// User management
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.post("/users", addUser);
router.patch("/users/:id/admin", toggleAdmin);
router.delete("/users/:id", removeUser);

// Course management
router.get("/courses", listCourses);
router.post("/courses", addCourse);
router.put("/courses/:id", editCourse);
router.delete("/courses/:id", removeCourse);

// Lesson management
router.get("/courses/:id/lessons", listLessons);
router.post("/courses/:id/lessons", addLesson);
router.put("/courses/:courseId/lessons/:lessonId", editLesson);
router.delete("/courses/:courseId/lessons/:lessonId", removeLesson);

// Media/Upload management
router.post("/upload", upload.single("file"), uploadFile);
router.post("/upload/multiple", upload.array("files", 10), uploadMultipleFiles);
router.get("/media", listMedia);
router.get("/media/:id", getMediaInfo);
router.delete("/media/:id", removeMedia);
router.patch("/media/:id/assign", assignMedia);
router.get("/media/entity/:type/:id", getEntityMedia);

export default router;
