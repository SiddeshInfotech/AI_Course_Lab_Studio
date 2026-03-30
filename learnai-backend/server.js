import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import videoRoutesNew from "./routes/videoRoutesNew.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import learningRoutes from "./routes/learningRoutes.js";
import encryptionRoutes from "./routes/encryptionRoutes.js";
import licenseRoutes from "./routes/licenseRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import centerRoutes from "./routes/centerRoutes.js";
import centerDashboardRoutes from "./routes/centerDashboardRoutes.js";
import { getStorageType, getStorageConfig } from "./config/storage.js";
import { initLocalStorage } from "./config/localStorage.js";
import { initMinioClient, testMinioConnection, ensureBucket } from "./config/minio.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration - supports both development and production
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Disposition", "X-Content-Type-Options"],
    maxAge: 86400, // 24 hours preflight cache
}));

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Serve static files from uploads folder
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1d',
    etag: false,
    setHeaders: (res, resPath) => {
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
}));

console.log(`📁 Serving static files from: ${uploadsPath}`);

// Storage initialization
let storageStatus = { initialized: false, type: null, error: null };

const initializeStorage = async () => {
    const storageType = getStorageType();
    storageStatus.type = storageType;

    try {
        switch (storageType) {
            case 'local':
                await initLocalStorage();
                console.log('✅ Local storage initialized');
                break;

            case 'minio':
                initMinioClient();
                const minioTest = await testMinioConnection();
                if (minioTest.success) {
                    const config = getStorageConfig();
                    await ensureBucket(config.bucket);
                    console.log('✅ MinIO storage initialized');
                } else {
                    console.warn('⚠️ MinIO connection failed, uploads will fail:', minioTest.error);
                    storageStatus.error = minioTest.error;
                }
                break;

            case 's3':
                console.log('✅ S3 storage configured (connection verified on first upload)');
                break;

            default:
                console.warn(`⚠️ Unknown storage type: ${storageType}`);
        }

        storageStatus.initialized = true;
    } catch (error) {
        console.error('❌ Storage initialization error:', error.message);
        storageStatus.error = error.message;
    }
};

// Initialize storage on startup
initializeStorage();

// Health check endpoint for connectivity testing
app.get("/api/health", async (req, res) => {
    const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        storage: {
            type: storageStatus.type,
            initialized: storageStatus.initialized,
            error: storageStatus.error
        }
    };

    // Quick storage connectivity check if requested
    if (req.query.checkStorage === 'true' && storageStatus.type === 'minio') {
        try {
            const minioTest = await testMinioConnection();
            health.storage.connected = minioTest.success;
            if (!minioTest.success) {
                health.storage.connectionError = minioTest.error;
            }
        } catch (e) {
            health.storage.connected = false;
            health.storage.connectionError = e.message;
        }
    }

    res.json(health);
});

// Request logging in development
if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/centers", centerRoutes);
app.use("/api/center", centerDashboardRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/videos", videoRoutesNew);
app.use("/api/admin/videos", videoRoutesNew);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/learning", learningRoutes);

// Encryption and License Management
app.use("/api/encryption", encryptionRoutes);
app.use("/api/license", licenseRoutes);

// Security & Access Logging
app.use("/api/security", securityRoutes);


// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    if (NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Handle CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: "CORS policy violation" });
    }

    // Handle JSON parsing errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: "Invalid JSON in request body" });
    }

    // Handle entity too large errors
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: "Request entity too large" });
    }

    // Default error response
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        message: NODE_ENV === 'production' ? "Internal server error" : err.message,
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});
