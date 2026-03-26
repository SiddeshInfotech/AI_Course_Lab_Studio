import { verifyToken } from "../utils/jwt.js";

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken =
            typeof authHeader === "string" && authHeader.startsWith("Bearer ")
                ? authHeader.slice(7).trim()
                : null;
        const legacyToken =
            typeof req.headers["x-access-token"] === "string"
                ? req.headers["x-access-token"]
                : null;
        const token = bearerToken || legacyToken;

        if (!token) {
            console.warn("⚠️  No token provided in request");
            return res.status(401).json({ message: "No token provided" });
        }

        try {
            const decoded = verifyToken(token);
            req.user = decoded;
            next();
        } catch (jwtError) {
            // Provide specific error information for debugging
            if (jwtError.name === 'TokenExpiredError') {
                console.warn(`🔴 Token expired at: ${new Date(jwtError.expiredAt)}`);
                return res.status(401).json({
                    message: "Token expired",
                    error: "TOKEN_EXPIRED",
                    expiredAt: jwtError.expiredAt
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                console.warn(`🔴 JWT validation failed: ${jwtError.message}`);
                return res.status(401).json({
                    message: "Invalid token format",
                    error: "INVALID_TOKEN_FORMAT"
                });
            } else {
                console.warn(`🔴 Token verification error: ${jwtError.message}`);
                return res.status(401).json({
                    message: "Invalid token",
                    error: "TOKEN_VERIFICATION_FAILED"
                });
            }
        }
    } catch (error) {
        console.error("❌ Unexpected auth middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default authMiddleware;