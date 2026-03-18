import express from "express";
import {
    listCourses,
    listEnrolledCourses,
    getCourse,
    addCourse,
    editCourse,
    removeCourse,
    enroll,
} from "../controllers/courseController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", listCourses);
router.get("/enrolled", authMiddleware, listEnrolledCourses);
router.get("/:id", getCourse);
router.post("/", authMiddleware, addCourse);
router.put("/:id", authMiddleware, editCourse);
router.delete("/:id", authMiddleware, removeCourse);
router.post("/:id/enroll", authMiddleware, enroll);

export default router;
