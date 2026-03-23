import prisma from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { signAccessToken, verifyAccessToken } from "../utils/jwt.js";

const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim().slice(0, 255);
    }
    return req.ip?.slice(0, 255) || null;
};

const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const getRefreshTokenFromRequest = (req) => {
    const bodyToken = req.body?.refreshToken;
    if (bodyToken) return bodyToken;

    const headerToken = req.headers["x-refresh-token"];
    if (typeof headerToken === "string" && headerToken) return headerToken;

    return null;
};

const getAccessTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7).trim();
    }

    const headerToken = req.headers["x-access-token"];
    if (typeof headerToken === "string" && headerToken) return headerToken;

    const bodyToken = req.body?.accessToken;
    if (typeof bodyToken === "string" && bodyToken) return bodyToken;

    return null;
};

const createSession = async (userId, req) => {
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
        data: {
            userId,
            refreshTokenHash,
            userAgent: req.headers["user-agent"]?.slice(0, 255) || null,
            ipAddress: getClientIp(req),
            expiresAt,
        },
    });

    return { session, refreshToken };
};

const buildAuthResponse = ({ userId, sessionId, refreshToken }) => {
    const accessToken = signAccessToken({ userId });
    return {
        accessToken,
        token: accessToken,
        refreshToken,
        sessionId,
    };
};

const getSafeUser = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    created_at: user.created_at,
});

export const login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const loginUsername =
            typeof username === "string" && username.trim()
                ? username.trim()
                : typeof email === "string" && email.trim()
                    ? email.trim()
                    : "";

        // validation
        if (!loginUsername || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        const user = await prisma.user.findUnique({
            where: { username: loginUsername },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const { session, refreshToken } = await createSession(user.id, req);
        const auth = buildAuthResponse({
            userId: user.id,
            sessionId: session.id,
            refreshToken,
        });

        res.json({
            ...auth,
            user: getSafeUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ message: "Name, username, and password are required" });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    ...(email ? [{ email }] : []),
                ],
            },
        });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ message: "Username already exists" });
            }
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                username: username.trim().toLowerCase(),
                email: email?.trim() || null,
                password: hashedPassword,
                isAdmin: false,
            },
        });

        const { session, refreshToken } = await createSession(user.id, req);
        const auth = buildAuthResponse({
            userId: user.id,
            sessionId: session.id,
            refreshToken,
        });

        res.status(201).json({
            ...auth,
            user: getSafeUser(user),
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const me = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                isAdmin: true,
                created_at: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({ user });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const refreshSession = async (req, res) => {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);

        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token required" });
        }

        const refreshTokenHash = hashToken(refreshToken);

        const session = await prisma.session.findUnique({
            where: { refreshTokenHash },
            select: {
                id: true,
                userId: true,
                expiresAt: true,
                revokedAt: true,
            },
        });

        if (!session || session.revokedAt) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        if (session.expiresAt < new Date()) {
            await prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            return res.status(401).json({ message: "Refresh token expired" });
        }

        const newRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashToken(newRefreshToken);
        const newExpiresAt = new Date(
            Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
        );

        await prisma.session.update({
            where: { id: session.id },
            data: {
                refreshTokenHash: newRefreshTokenHash,
                expiresAt: newExpiresAt,
                userAgent: req.headers["user-agent"]?.slice(0, 255) || null,
                ipAddress: getClientIp(req),
            },
        });

        const auth = buildAuthResponse({
            userId: session.userId,
            sessionId: session.id,
            refreshToken: newRefreshToken,
        });

        res.json(auth);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const logout = async (req, res) => {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);

        if (!refreshToken) {
            const accessToken = getAccessTokenFromRequest(req);
            if (!accessToken) {
                return res.status(400).json({ message: "Refresh token required" });
            }

            try {
                const payload = verifyAccessToken(accessToken);
                const userId = Number(payload?.userId);

                if (Number.isInteger(userId)) {
                    await prisma.session.updateMany({
                        where: { userId, revokedAt: null },
                        data: { revokedAt: new Date() },
                    });
                }
            } catch {
                // Keep logout idempotent even when token is stale/invalid.
            }

            return res.status(200).json({ message: "Logged out" });
        }

        const refreshTokenHash = hashToken(refreshToken);

        const session = await prisma.session.findUnique({
            where: { refreshTokenHash },
            select: { id: true, revokedAt: true },
        });

        if (!session) {
            return res.status(200).json({ message: "Logged out" });
        }

        if (!session.revokedAt) {
            await prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
        }

        res.status(200).json({ message: "Logged out" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};