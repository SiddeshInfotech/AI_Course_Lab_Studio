import jwt from "jsonwebtoken";

export const signAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_TTL || "7d",
    });
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

// Backward-compatible aliases for existing imports.
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
