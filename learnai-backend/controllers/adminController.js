import bcrypt from "bcrypt";
import prisma from "../config/db.js";
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

// Get detailed user information with enrolled courses
export const getUserDetailed = async (req, res) => {
    try {
        const rawId = req.params.id;
        const id = parseInt(rawId);

        // Validate the ID
        if (isNaN(id) || id <= 0 || id > 2147483647) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                rollNumber: true,
                dob: true,
                isAdmin: true,
                created_at: true,
                centerId: true,
                enrollments: {
                    select: {
                        courseId: true,
                        course: {
                            select: {
                                id: true,
                                title: true,
                                category: true,
                                level: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Format the response to include course IDs in a flat array
        const response = {
            ...user,
            enrolledCourseIds: user.enrollments.map(enrollment => enrollment.courseId),
            enrolledCourses: user.enrollments.map(enrollment => enrollment.course)
        };

        // Remove the nested enrollments from response
        delete response.enrollments;

        res.json(response);
    } catch (error) {
        console.error("Get user detailed error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const addUser = async (req, res) => {
    try {
        const { name, username, email, password, isAdmin, courseIds, rollNumber, dob } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ message: "Name, username, and password are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and enrollments in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the user
            const user = await tx.user.create({
                data: {
                    name,
                    username,
                    email: email || null,
                    password: hashedPassword,
                    rollNumber: rollNumber || null,
                    dob: dob ? new Date(dob) : null,
                    isAdmin: isAdmin || false,
                }
            });

            // Create enrollments if course IDs are provided
            if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
                const enrollmentData = courseIds
                    .filter(id => Number.isInteger(id) && id > 0)
                    .map(courseId => ({
                        userId: user.id,
                        courseId: courseId,
                    }));

                if (enrollmentData.length > 0) {
                    await tx.enrollment.createMany({
                        data: enrollmentData,
                        skipDuplicates: true // Prevent errors if enrollment already exists
                    });
                }
            }

            return user;
        });

        res.status(201).json({
            id: result.id,
            name: result.name,
            username: result.username,
            email: result.email,
            rollNumber: result.rollNumber,
            dob: result.dob,
            isAdmin: result.isAdmin,
            enrolledCourses: courseIds ? courseIds.length : 0
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

// Update user (edit student)
export const updateUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, email, rollNumber, dob, centerId, courseIds } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update user data
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email || null;
        if (rollNumber !== undefined) updateData.rollNumber = rollNumber || null;
        if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
        if (centerId !== undefined) updateData.centerId = centerId ? parseInt(centerId) : null;

        // Update user and enrollments in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update user
            const user = await tx.user.update({
                where: { id },
                data: updateData
            });

            // Handle course enrollments if provided
            if (courseIds !== undefined) {
                // Remove existing enrollments
                await tx.enrollment.deleteMany({
                    where: { userId: id }
                });

                // Add new enrollments
                if (courseIds.length > 0) {
                    const enrollmentData = courseIds
                        .filter(courseId => Number.isInteger(courseId) && courseId > 0)
                        .map(courseId => ({
                            userId: id,
                            courseId
                        }));

                    if (enrollmentData.length > 0) {
                        await tx.enrollment.createMany({
                            data: enrollmentData,
                            skipDuplicates: true
                        });
                    }
                }
            }

            // Get updated user with center info
            const updatedUser = await tx.user.findUnique({
                where: { id },
                include: {
                    center: {
                        select: {
                            centerName: true,
                            centerCode: true
                        }
                    }
                }
            });

            return updatedUser;
        });

        res.json({
            message: "User updated successfully",
            user: {
                id: result.id,
                name: result.name,
                username: result.username,
                email: result.email,
                rollNumber: result.rollNumber,
                dob: result.dob,
                centerId: result.centerId,
                center: result.center
            }
        });
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
