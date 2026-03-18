import prisma from "../config/db.js";

export const getAllTools = (filters = {}) =>
    prisma.tool.findMany({
        where: filters,
        orderBy: { createdAt: "desc" },
    });

export const getToolById = (id) =>
    prisma.tool.findUnique({ where: { id } });

export const createTool = (data) =>
    prisma.tool.create({ data });

export const updateTool = (id, data) =>
    prisma.tool.update({ where: { id }, data });

export const deleteTool = (id) =>
    prisma.tool.delete({ where: { id } });
