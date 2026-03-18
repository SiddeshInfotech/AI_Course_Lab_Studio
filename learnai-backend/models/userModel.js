import prisma from "../config/db.js";

export const findUserByEmail = (email) =>
    prisma.user.findUnique({ where: { email } });

export const findUserById = (id) =>
    prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, created_at: true },
    });

export const createUser = (data) =>
    prisma.user.create({ data });
