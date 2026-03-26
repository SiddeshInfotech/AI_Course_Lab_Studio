import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const bucket = process.env.AWS_S3_BUCKET;

export const getS3Client = () => s3Client;

export const getS3Bucket = () => bucket;

export const generateS3Key = (originalName, entityType = "media") => {
    const ext = path.extname(originalName);
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${entityType}/${timestamp}-${uuid}${ext}`;
};

export const multerS3Storage = multerS3({
    s3: s3Client,
    bucket: bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, {
            fieldName: file.fieldname,
            originalName: file.originalname,
            mimetype: file.mimetype,
            uploadDate: new Date().toISOString(),
        });
    },
    key: function (req, file, cb) {
        const key = generateS3Key(file.originalname, "videos");
        cb(null, key);
    },
});

export const getPublicUrl = (key) => {
    return `https://${bucket}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${key}`;
};

export default s3Client;
