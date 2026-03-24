-- CreateTable
CREATE TABLE "ToolCourse" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "toolId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'Day 1',
    "sectionTitle" TEXT,
    "description" TEXT,
    "demoVideoUrl" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "toolCourseId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolCourse_courseId_idx" ON "ToolCourse"("courseId");

-- CreateIndex
CREATE INDEX "ToolCourse_toolId_idx" ON "ToolCourse"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolCourse_courseId_toolId_key" ON "ToolCourse"("courseId", "toolId");

-- CreateIndex
CREATE INDEX "ToolProgress_userId_idx" ON "ToolProgress"("userId");

-- CreateIndex
CREATE INDEX "ToolProgress_toolCourseId_idx" ON "ToolProgress"("toolCourseId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolProgress_userId_toolCourseId_key" ON "ToolProgress"("userId", "toolCourseId");

-- AddForeignKey
ALTER TABLE "ToolCourse" ADD CONSTRAINT "ToolCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCourse" ADD CONSTRAINT "ToolCourse_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolProgress" ADD CONSTRAINT "ToolProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolProgress" ADD CONSTRAINT "ToolProgress_toolCourseId_fkey" FOREIGN KEY ("toolCourseId") REFERENCES "ToolCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
