import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const signAccessToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
        });
    } catch (error) {
        console.error("❌ JWT sign error:", error);
        throw error;
    }
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error("❌ JWT verify error:", error);
        throw error;
    }
};

// Backward-compatible aliases for existing imports.
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
