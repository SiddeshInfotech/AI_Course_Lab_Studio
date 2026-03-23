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
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = verifyToken(token);

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};


export default authMiddleware;