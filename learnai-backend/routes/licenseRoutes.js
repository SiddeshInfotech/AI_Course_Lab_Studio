import express from "express";
import {
  generateLicense,
  validateLicense,
  validateCourseAccess,
  revokeLicense,
  getUserLicenses,
  extendLicense,
  getLicenseStatus,
} from "../controllers/licenseController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// All license routes require authentication
router.use(authMiddleware);

// Admin routes
router.post("/generate", adminMiddleware, generateLicense);
router.post("/revoke/:licenseId", adminMiddleware, revokeLicense);
router.post("/extend/:licenseId", adminMiddleware, extendLicense);

// User routes
router.post("/validate", validateLicense); // Validate license from Electron app
router.get("/validate", validateCourseAccess);
router.get("/my-licenses", getUserLicenses);
router.get("/status/:licenseId", getLicenseStatus);

export default router;
