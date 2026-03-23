import prisma from "../config/db.js";

export const findUserByUsername = (username) =>
    prisma.user.findUnique({ where: { username } });

export const findUserById = (id) =>
    prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, username: true, email: true, created_at: true },
    });

export const createUser = (data) =>
    prisma.user.create({ data });
