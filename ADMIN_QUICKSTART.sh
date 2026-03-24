#!/bin/bash
# Quick Reference - LearnAI Admin Commands

# ============================================
# 🚀 STARTING THE PLATFORM
# ============================================

# Terminal 1: Backend
cd learnai-backend
npm install          # First time only
npm run db:studio    # View database (optional)
npm start            # Start server on port 5001

# Terminal 2: Frontend  
cd learnai-frontend
npm install          # First time only
npm run dev          # Start on http://localhost:3000

# ============================================
# 👤 LOGIN CREDENTIALS
# ============================================

# Admin
Username: admin
Password: admin123

# Student Test Account
Username: student
Password: student123

# ============================================
# 🎓 CREATE FIRST COURSE (Example)
# ============================================

curl -X POST http://localhost:5001/api/courses/admin/generate-from-tools \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "From Prompts to Videos: Complete Guide",
    "description": "Learn how to convert text prompts to stunning videos using AI",
    "category": "Content Creation",
    "level": "beginner",
    "instructor": "AI Master",
    "duration": "3 weeks",
    "inputType": "Text",
    "outputType": "Video"
  }'

# ============================================
# 📊 AVAILABLE TOOL MAPPINGS
# ============================================

# Text Processing
Text → Text       (ChatGPT, Gemini, Claude)
Text → Audio      (Suno, ElevenLabs)

# Visual Creation
Text → Image      (Ideogram, Freepik, Leonardo)
Text → Video      (InVideo, Hedra, HeyGen, Synthesia)
Text → Animation  (Animaker, Meshy)

# Content Analysis
Image → Text      (Google Lens, ChatGPT Vision)
Video → Text      (Descript, Otter.ai)
Audio → Text      (Bhashini, Otter.ai)

# Advanced
Video → Video     (Wisecut, Nolej)
Image → Video     (RunwayML)

# ============================================
# 🔍 API ENDPOINTS - POST WITH ADMIN TOKEN
# ============================================

# Get all available tool mappings
GET /api/courses/admin/mappings

# Generate course from tool mapping
POST /api/courses/admin/generate-from-tools
Body: { title, description, category, level, instructor, duration, inputType, outputType }

# ============================================
# 📚 STUDENT VIEW
# ============================================

# As student: GET /api/learning/{courseId}/tools
# Shows all tools for the course with:
# - Day 1, Day 2, Day 3... organization
# - Demo video for each tool
# - Tool details and descriptions
# - Progress tracking

# Mark tool complete
POST /api/learning/tools/{toolCourseId}/complete

# ============================================
# 🗄️ DATABASE OPERATIONS
# ============================================

# Reset database (WARNING - deletes all data except users/tools)
npm run db:reset

# View database schema
npm run db:studio

# Generate new migration
npx prisma migrate dev --name description

# ============================================
# 🐛 TROUBLESHOOTING
# ============================================

# Backend won't start?
- Check env variables in .env
- Run: npm install
- Check port 5001 is free

# Frontend won't start?
- Run: npm install
- Run: npm run build
- Clear .next folder

# Database issues?
- Check DATABASE_URL in .env
- Run: npm run db:reset
- Ensure Neon credentials are valid

# API 404 errors?
- Check backend is running on port 5001
- Verify token in Authorization header
- Check API endpoint spelling

# ============================================
# 💡 WORKFLOW
# ============================================

1. Admin logs in
2. Admin calls /admin/generate-from-tools
3. Course created with tools automatically linked
4. Admin (optional) can edit tool URLs via /api/tools/course/:id
5. Student enrolls in course
6. Student sees tools + demo videos organized by day
7. Student completes tools → progress tracked
8. Course completion = all tools + lessons done

# ============================================
# 🎯 KEY FEATURES
# ============================================

✅ 50 AI Tools pre-populated
✅ Automatic course generation from input/output mappings
✅ Tools organized by learning days
✅ Demo videos per tool
✅ Student progress tracking
✅ Mixed lessons + tools curriculum
✅ Admin course management
✅ Theme and UI unchanged
✅ Production-ready database setup

# ============================================
