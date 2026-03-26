import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Log when JWT_SECRET is using the default (dangerous)
if (!process.env.JWT_SECRET) {
    console.warn("⚠️  JWT_SECRET not set in environment! Using insecure default.");
}

export const signAccessToken = (payload) => {
    try {
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
        });
        console.log(`✅ Access token signed for user ${payload.userId} (expires in ${process.env.ACCESS_TOKEN_TTL || "15m"})`);
        return token;
    } catch (error) {
        console.error("❌ JWT sign error:", error);
        throw error;
    }
};

export const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`✅ Token verified for user ${decoded.userId}`);
        return decoded;
    } catch (error) {
        // Log specific error types for debugging
        if (error.name === 'TokenExpiredError') {
            console.warn(`🔴 Token verification failed: Expired at ${new Date(error.expiredAt)}`);
        } else if (error.name === 'JsonWebTokenError') {
            console.warn(`🔴 Token verification failed: Invalid format - ${error.message}`);
        } else {
            console.warn(`🔴 Token verification failed: ${error.message}`);
        }
        throw error;
    }
};

// Backward-compatible aliases for existing imports.
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
