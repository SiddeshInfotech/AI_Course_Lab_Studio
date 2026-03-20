# Learn AI Project Documentation

## 1. Project Overview

This workspace contains two related codebases:

1. `AI_Course_Lab_Studio` (frontend)
2. `learnai-backend` (backend API + database)

The current frontend branch focuses on authentication UI and auth API integration.

## 2. High-Level Architecture

```text
Browser (Next.js frontend)
  -> HTTP JSON requests (fetch)
Express API (learnai-backend)
  -> Prisma ORM
PostgreSQL (Neon)
```

Auth and data are split this way:

1. Frontend handles forms, validation, UI states, and stores JWT token in `localStorage`.
2. Backend validates requests, hashes passwords, verifies JWT, and performs DB operations.
3. Prisma maps JavaScript objects to PostgreSQL tables.

## 3. Repositories and Responsibilities

### 3.1 Frontend: `AI_Course_Lab_Studio/frontend`

- Framework: Next.js (App Router), React, TypeScript
- Styling: Tailwind classes in components/pages
- Form stack: `react-hook-form` + `zod`

### 3.2 Backend: `learnai-backend`

- Framework: Express (ES modules)
- ORM: Prisma
- Auth: JWT + bcrypt
- DB: PostgreSQL

## 4. Frontend File-by-File Guide

### App entry and routing

- `AI_Course_Lab_Studio/frontend/app/layout.tsx`

  - Global app shell and metadata (`AI Lab Studio`).
  - Imports global stylesheet.

- `AI_Course_Lab_Studio/frontend/app/page.tsx`
  - Redirects `/` to `/login`.

### Auth pages

- `AI_Course_Lab_Studio/frontend/app/login/page.tsx`

  - Login form UI.
  - Client-side validation via `loginSchema`.
  - On submit calls `loginUser(email, password)` from `lib/api.ts`.
  - Stores returned JWT in `localStorage` as `token`.
  - Shows backend error message in the red alert box.

- `AI_Course_Lab_Studio/frontend/app/register/page.tsx`
  - Registration form UI.
  - Validation schema includes password rules and `confirmPassword` match.
  - On submit calls `registerUser(name, email, password)`.
  - Redirects to `/login` on success.

### Shared frontend utilities/components

- `AI_Course_Lab_Studio/frontend/lib/api.ts`

  - Centralized frontend API client for auth.
  - Reads backend base URL from `NEXT_PUBLIC_API_BASE_URL`.
  - Exposes:
    - `loginUser(email, password)`
    - `registerUser(name, email, password)`
  - Normalizes backend error response through `parseResponse`.

- `AI_Course_Lab_Studio/frontend/lib/utils.ts`

  - `cn()` helper to merge class names (`clsx` + `tailwind-merge`).

- `AI_Course_Lab_Studio/frontend/components/ui/button.tsx`

  - Reusable Button component with style variants.

- `AI_Course_Lab_Studio/frontend/components/ui/input.tsx`

  - Reusable Input component.

- `AI_Course_Lab_Studio/frontend/components/ui/label.tsx`

  - Reusable Label component.

- `AI_Course_Lab_Studio/frontend/components/password-eye.tsx`

  - Animated password visibility icon component (currently not wired in login/register pages).

- `AI_Course_Lab_Studio/frontend/hooks/use-mobile.ts`
  - Utility hook for mobile breakpoint detection.

### Frontend config files

- `AI_Course_Lab_Studio/frontend/package.json`

  - Scripts: `dev`, `build`, `start`, `lint`, `clean`.

- `AI_Course_Lab_Studio/frontend/next.config.ts`

  - Strict mode on.
  - Ignores lint errors during build.
  - Enables standalone output.
  - Adds image remote pattern (`picsum.photos`).
  - Disables HMR watch when `DISABLE_HMR=true`.

- `AI_Course_Lab_Studio/frontend/.env.example`
  - Expected frontend env var:
    - `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api`

## 5. Backend File-by-File Guide

### Server bootstrap

- `learnai-backend/server.js`
  - Loads environment variables.
  - Configures CORS and JSON parser.
  - Mounts route groups:
    - `/api/auth`
    - `/api/courses`
    - `/api/tools`
  - Adds global error handler.
  - Starts server on `PORT` (default `5001`).

### Route definitions

- `learnai-backend/routes/authRoutes.js`

  - `POST /register`
  - `POST /login`

- `learnai-backend/routes/courseRoutes.js`

  - Public:
    - `GET /`
    - `GET /:id`
  - Protected (JWT middleware):
    - `GET /enrolled`
    - `POST /`
    - `PUT /:id`
    - `DELETE /:id`
    - `POST /:id/enroll`

- `learnai-backend/routes/toolRoutes.js`
  - Public:
    - `GET /`
    - `GET /:id`
  - Protected:
    - `POST /`
    - `PUT /:id`
    - `DELETE /:id`

### Controllers (request handling)

- `learnai-backend/controllers/authController.js`

  - `register`:
    - validates input
    - checks existing user
    - hashes password
    - creates user
    - returns JWT
  - `login`:
    - validates input
    - verifies user and password
    - returns JWT

- `learnai-backend/controllers/courseController.js`

  - Handles list/get/create/update/delete courses.
  - Handles enrollment and enrolled courses list.
  - Uses `req.user.userId` from auth middleware for user-specific actions.

- `learnai-backend/controllers/toolController.js`
  - Handles list/get/create/update/delete tools.
  - Supports optional filtering by category and premium flag.

### Data access layer (models)

- `learnai-backend/models/courseModel.js`

  - Prisma queries for courses and enrollments.

- `learnai-backend/models/toolModel.js`

  - Prisma queries for tools.

- `learnai-backend/models/userModel.js`
  - User lookup/create helpers (currently auth controller queries Prisma directly).

### Middleware and utilities

- `learnai-backend/middleware/authMiddleware.js`

  - Reads `Authorization: Bearer <token>`.
  - Verifies JWT and injects decoded payload into `req.user`.

- `learnai-backend/utils/jwt.js`

  - `signToken(payload)` with 7-day expiry.
  - `verifyToken(token)`.

- `learnai-backend/config/db.js`
  - Creates and exports Prisma client instance.

### Database schema and migrations

- `learnai-backend/prisma/schema.prisma`

  - Defines models:
    - `User`
    - `Course`
    - `Tool`
    - `Enrollment`
  - Includes unique enrollment constraint (`userId + courseId`).

- `learnai-backend/prisma/migrations/*`
  - Migration history for schema evolution.

## 6. API Contract (Current)

Base URL (local): `http://localhost:5001/api`

### Auth

1. `POST /auth/register`

   - body: `{ name, email, password }`
   - success: `201` with `{ message, token }`

2. `POST /auth/login`
   - body: `{ email, password }`
   - success: `200` with `{ token }`

### Courses

1. `GET /courses`
2. `GET /courses/:id`
3. `GET /courses/enrolled` (protected)
4. `POST /courses` (protected)
5. `PUT /courses/:id` (protected)
6. `DELETE /courses/:id` (protected)
7. `POST /courses/:id/enroll` (protected)

### Tools

1. `GET /tools`
   - optional query: `category`, `isPremium`
2. `GET /tools/:id`
3. `POST /tools` (protected)
4. `PUT /tools/:id` (protected)
5. `DELETE /tools/:id` (protected)

## 7. End-to-End Flow (How Things Work)

### Register flow

1. User opens `/register`.
2. Frontend validates fields with Zod.
3. Frontend calls `POST /api/auth/register`.
4. Backend creates user and returns JWT.
5. Frontend redirects user to `/login`.

### Login flow

1. User opens `/login`.
2. Frontend validates fields with Zod.
3. Frontend calls `POST /api/auth/login`.
4. Backend verifies credentials and returns JWT.
5. Frontend stores JWT in `localStorage`.

### Protected API flow

1. Frontend includes token as `Authorization: Bearer <token>`.
2. `authMiddleware` validates token.
3. Controller uses `req.user.userId` for user-bound operations.

## 8. Local Development

### Start backend

```bash
cd "/Users/pradhanvarpe/Desktop/Learn AI copy/learnai-backend"
npm run dev
```

### Start frontend

```bash
cd "/Users/pradhanvarpe/Desktop/Learn AI copy/AI_Course_Lab_Studio/frontend"
npm run dev
```

### Required environment variables

Backend (`learnai-backend/.env`):

1. `DATABASE_URL`
2. `JWT_SECRET`
3. optional `PORT` (defaults to `5001`)

Frontend (`AI_Course_Lab_Studio/frontend/.env.local`):

1. `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api`

## 9. Current Gaps and Notes

1. Login currently stores token but does not redirect to a protected page/dashboard yet.
2. Frontend currently only integrates auth endpoints. Courses/tools UI integration is not yet implemented.
3. Backend `.env` contains real secrets in local file; ensure secrets are never committed to public repos.
4. `userModel.js` exists but auth controller currently uses Prisma directly, so user model helpers are partially unused.

## 10. Quick File Map

### Frontend most important files

1. `AI_Course_Lab_Studio/frontend/app/login/page.tsx`
2. `AI_Course_Lab_Studio/frontend/app/register/page.tsx`
3. `AI_Course_Lab_Studio/frontend/lib/api.ts`
4. `AI_Course_Lab_Studio/frontend/app/layout.tsx`
5. `AI_Course_Lab_Studio/frontend/app/page.tsx`

### Backend most important files

1. `learnai-backend/server.js`
2. `learnai-backend/routes/*.js`
3. `learnai-backend/controllers/*.js`
4. `learnai-backend/models/*.js`
5. `learnai-backend/prisma/schema.prisma`
6. `learnai-backend/middleware/authMiddleware.js`
