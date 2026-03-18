import prisma from "../config/db.js";

export const getAllCourses = () =>
    prisma.course.findMany({ orderBy: { createdAt: "desc" } });

export const getCourseById = (id) =>
    prisma.course.findUnique({ where: { id } });

export const createCourse = (data) =>
    prisma.course.create({ data });

export const updateCourse = (id, data) =>
    prisma.course.update({ where: { id }, data });

export const deleteCourse = (id) =>
    prisma.course.delete({ where: { id } });

export const enrollUser = (userId, courseId) =>
    prisma.enrollment.create({ data: { userId, courseId } });

export const getEnrollment = (userId, courseId) =>
    prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
    });

export const getUserEnrollments = (userId) =>
    prisma.enrollment.findMany({
        where: { userId },
        include: { course: true },
        orderBy: { enrolledAt: "desc" },
    });
