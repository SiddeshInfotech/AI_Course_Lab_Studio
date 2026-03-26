import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_SUBDIRS = ['videos', 'thumbnails', 'images', 'documents'];
let cachedBasePath = null;

const getBasePath = () => {
    if (cachedBasePath) return cachedBasePath;
    cachedBasePath = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
    return cachedBasePath;
};

export const ensureDir = async (dirPath) => {
    try {
        await fsPromises.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
};

export const getFilePath = (key) => {
    const basePath = getBasePath();
    return path.join(basePath, key);
};

export const getFilePathFromUrl = (url) => {
    const basePath = getBasePath();
    const uploadsIndex = url.indexOf('/uploads/');

    if (uploadsIndex !== -1) {
        const relativePath = url.substring(uploadsIndex + '/uploads/'.length - 1);
        return path.join(basePath, relativePath);
    }

    return path.join(basePath, url);
};

export const getLocalClient = () => {
    return {
        basePath: getBasePath(),
        ensureDir,
        getFilePath
    };
};

export const initLocalStorage = async () => {
    const basePath = getBasePath();
    const dirPaths = [
        basePath,
        ...STORAGE_SUBDIRS.map(dir => path.join(basePath, dir))
    ];

    await Promise.all(dirPaths.map(dirPath => ensureDir(dirPath)));
    console.log('Local storage initialized at:', basePath);
};

export default {
    ensureDir,
    getFilePath,
    getFilePathFromUrl,
    getLocalClient,
    initLocalStorage
};
