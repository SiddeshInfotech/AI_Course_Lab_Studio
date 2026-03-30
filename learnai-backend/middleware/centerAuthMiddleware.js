import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Middleware to authenticate center administrators
 */
export const centerAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access token is required"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);

        if (decoded.type !== "center") {
            return res.status(401).json({
                message: "Invalid token. Center access required."
            });
        }

        req.centerId = decoded.id;
        req.centerAdminId = decoded.centerAdminId;
        req.tokenType = "center";

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Access token has expired"
            });
        }
        return res.status(401).json({
            message: "Invalid access token"
        });
    }
};
