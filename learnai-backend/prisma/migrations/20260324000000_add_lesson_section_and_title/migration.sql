-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "section" TEXT,
ADD COLUMN "sectionTitle" TEXT,
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'video',
ADD COLUMN "objectives" TEXT;

-- CreateIndex
CREATE INDEX "Lesson_section_idx" ON "Lesson"("section");
