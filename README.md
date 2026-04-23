# LearnAI Course Lab Studio

LearnAI Course Lab Studio is a full-stack AI learning platform with:

- A Next.js frontend (also packaged as an Electron desktop app)
- An Express + Prisma backend API
- PostgreSQL for core data
- Pluggable media storage (MinIO, S3, or local)
- Course, lesson, tool, progress, center, admin, license, and media security workflows

## Project Overview

The platform is designed for AI course delivery and management:

- Admins can manage students, courses, media, and centers
- Students can log in, consume lessons/tools, and track progress
- Centers can use dedicated center auth/dashboard flows
- Video/media access supports signed URLs, license checks, and security logging
- AI tool catalogs are seeded to bootstrap course creation quickly

## Repository Structure

```text
AI_Course_Lab_Studio/
├─ learnai-backend/         # Express API + Prisma + media/security services
├─ learnai-frontend/        # Next.js app + Electron desktop packaging
├─ docs/                    # Project-level docs (content protection, etc.)
├─ ADMIN_QUICKSTART.sh      # Quick runbook for admin/dev flow
├─ run-migration.sh         # Security migration helper
├─ test-*.sh / test-*.js    # Debug and validation scripts
└─ .env.test.example        # Test environment variables sample
```

## Tech Stack

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Motion (animations)
- Lucide icons
- React Player
- Electron 41 (desktop runtime)
- Electron Builder (desktop packaging)

### Backend

- Node.js (ES Modules)
- Express 5
- Prisma ORM + Prisma Client
- PostgreSQL
- JWT auth
- bcrypt password hashing
- multer for uploads
- fluent-ffmpeg / ffmpeg-static for media processing
- MinIO SDK and AWS S3 SDK for object storage
- Redis client dependency available

### Data and Storage

- Primary database: PostgreSQL (via `DATABASE_URL`)
- Supported media storage modes:
  - `minio` (default)
  - `s3`
  - `local`

### Security and Protection

- Signed media URL flow
- License validation endpoints/hooks
- Security/access logging migration support
- Content protection docs and Electron hardening options

## Prerequisites

Install before setup:

- Node.js 20+ (recommended)
- npm 10+
- PostgreSQL (local or hosted, e.g., Neon)
- MinIO (if using default MinIO storage mode)
- ffmpeg available in environment (helpful for media workflows)

## Environment Setup

## 1) Backend environment

Create `learnai-backend/.env` with at least the following:

```env
# Core
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
JWT_SECRET=replace-with-strong-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30d
SIGNED_URL_SECRET=replace-with-strong-secret

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Storage mode: minio | s3 | local
STORAGE_TYPE=minio

# Local storage mode
UPLOAD_PATH=./uploads
STATIC_URL=http://localhost:5001

# MinIO mode (default)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=learnai-videos
MINIO_REGION=us-east-1
MINIO_USE_SSL=false

# S3 mode (only if STORAGE_TYPE=s3)
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 2) Frontend environment

Copy sample:

- `learnai-frontend/.env.local.example` -> `learnai-frontend/.env.local`

Minimum useful values:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api
NEXT_PUBLIC_ENV=development

VIDEO_MASTER_KEY=your_32_byte_hex_key_here
LICENSE_MASTER_SECRET=your_secret_key_here

NEXT_PUBLIC_ENABLE_ENCRYPTION=true
NEXT_PUBLIC_ENABLE_DEVICE_BINDING=true
NEXT_PUBLIC_ENABLE_VIDEO_WATERMARK=true
```

## 3) Test environment (optional)

Copy and edit:

- `.env.test.example` -> `.env.test`

## Install Dependencies

Run from the project root `AI_Course_Lab_Studio`:

```bash
cd learnai-backend
npm install

cd ../learnai-frontend
npm install
```

## Database Setup

From `learnai-backend`:

```bash
# Push Prisma schema to database
npm run db:push

# Seed initial data (users + tools + sample course)
npm run seed

# Optional DB UI
npm run db:studio
```

Default seeded credentials (from seed script):

- Admin: username `admin`, password `admin123`
- Student: username `student`, password `student123`

## Run the Platform

Use two terminals.

### Terminal 1: Backend API

```bash
cd learnai-backend
npm start
```

Backend starts on:

- `http://localhost:5001`
- Health: `http://localhost:5001/api/health`

### Terminal 2: Frontend

#### Option A: Web app only

```bash
cd learnai-frontend
npm run next:dev
```

Web app starts on:

- `http://localhost:3000`

#### Option B: Electron desktop + Next dev

```bash
cd learnai-frontend
npm run dev
```

This compiles Electron TS, starts Next.js, then launches Electron.

## Backend API Modules (High-Level)

Main route groups mounted in server:

- `/api/auth`
- `/api/courses`
- `/api/tools`
- `/api/usage`
- `/api/progress`
- `/api/admin`
- `/api/centers`
- `/api/center`
- `/api/media`
- `/api/videos`
- `/api/admin/videos`
- `/api/dashboard`
- `/api/learning`
- `/api/encryption`
- `/api/license`
- `/api/security`

## Useful Commands

### Backend (`learnai-backend/package.json`)

```bash
npm start        # Start API
npm run dev      # Same as start currently
npm run db:push  # Push Prisma schema
npm run db:studio
npm run seed
```

### Frontend (`learnai-frontend/package.json`)

```bash
npm run next:dev         # Next.js dev server
npm run dev              # Electron + Next dev
npm run build            # Production build + Electron build
npm run electron:build   # Desktop package
npm run dist             # Build distributables (no publish)
npm run lint
```

## Helper Scripts in Project Root

The root folder includes helper/debug scripts such as:

- `ADMIN_QUICKSTART.sh`
- `check-github-status.sh`
- `cleanup-git.sh`
- `cleanup-git-history.sh`
- `debug-guide.sh`
- `run-migration.sh`
- `test-admin-course-management.sh`
- `test-media-security.sh`
- `test-signed-url.sh`
- `test-video-fix.sh`
- `test-minio-upload.js`
- `fix-admin-upload.js`

Use these as operational utilities for migration, upload debugging, and security/media checks.

## Storage Modes

### MinIO (default)

- Set `STORAGE_TYPE=minio`
- Ensure MinIO server is running and credentials are valid
- Bucket is auto-created when possible

### Local filesystem

- Set `STORAGE_TYPE=local`
- Files are stored under `UPLOAD_PATH` (default `./uploads`)
- Served by backend static route `/uploads`

### AWS S3

- Set `STORAGE_TYPE=s3`
- Provide AWS bucket and credentials

## Security Notes

Current implementation includes:

- JWT-based auth/session model
- Signed URL media access support
- Security logging migration scripts
- Electron hardening options and content protection guidance

Read:

- `docs/CONTENT_PROTECTION.md`
- `learnai-backend/docs/UNIFIED_VIDEO.md`

## Troubleshooting

### Backend not starting

- Verify `learnai-backend/.env`
- Check `DATABASE_URL` connectivity
- Ensure port 5001 is free

### Frontend API errors

- Confirm backend is running on 5001
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
- Check browser/Electron console for auth token issues

### Media upload issues

- Confirm chosen storage mode variables are set
- For MinIO, verify endpoint and bucket access
- Check backend logs for upload adapter errors

### Database issues

- Run `npm run db:push`
- Open Prisma Studio with `npm run db:studio`
- Re-seed with `npm run seed` when bootstrapping local env

## Development Flow (Recommended)

1. Start backend
2. Start frontend (web or Electron)
3. Log in as admin
4. Verify course/tool/center workflows
5. Validate media upload/playback
6. Run security/media test scripts as needed

## License

Internal project. Add your preferred license metadata if this will be open sourced.
