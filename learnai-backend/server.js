import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import learningRoutes from "./routes/learningRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/admin/videos", videoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/learning", learningRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
