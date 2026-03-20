import express from "express";
import {
    register,
    login,
    refreshSession,
    logout,
    me,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;