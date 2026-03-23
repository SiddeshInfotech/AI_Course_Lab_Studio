import bcrypt from "bcrypt";
import {
    getAllUsers,
    getUserById,
    setUserAdmin,
    createUser,
    deleteUser,
    getDashboardStats,
} from "../models/adminModel.js";

// ========== DASHBOARD ==========
export const dashboard = async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ========== USER MANAGEMENT ==========
export const listUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (error) {
        console.error("List users error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = await getUserById(id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const addUser = async (req, res) => {
    try {
        const { name, username, email, password, isAdmin } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ message: "Name, username, and password are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await createUser({
            name,
            username,
            email: email || null,
            password: hashedPassword,
            isAdmin: isAdmin || false,
        });

        res.status(201).json({
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
        });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Username or email already exists" });
        }
        console.error("Add user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleAdmin = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { isAdmin } = req.body;

        if (typeof isAdmin !== "boolean") {
            return res.status(400).json({ message: "isAdmin must be a boolean" });
        }

        // Prevent admin from removing their own admin status
        if (id === req.user.userId && !isAdmin) {
            return res.status(400).json({ message: "Cannot remove your own admin status" });
        }

        const user = await setUserAdmin(id, isAdmin);
        res.json({ message: `Admin status updated`, isAdmin: user.isAdmin });
    } catch (error) {
        console.error("Toggle admin error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const removeUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Prevent admin from deleting themselves
        if (id === req.user.userId) {
            return res.status(400).json({ message: "Cannot delete your own account" });
        }

        await deleteUser(id);
        res.json({ message: "User deleted" });
    } catch (error) {
        console.error("Remove user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
