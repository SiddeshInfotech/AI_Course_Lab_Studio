-- Add username for student-id-based authentication
ALTER TABLE "User"
ADD COLUMN "username" TEXT;

-- Backfill username for existing rows so the NOT NULL/UNIQUE constraints can be applied safely
UPDATE "User"
SET "username" = "email"
WHERE "username" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Email is no longer required for login; keep it optional for admin records
ALTER TABLE "User"
ALTER COLUMN "email" DROP NOT NULL;
