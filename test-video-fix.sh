#!/bin/bash

echo "🧪 TESTING VIDEO DISPLAY ON LEARNING PAGE"
echo ""

echo "📋 Pre-test Checklist:"
echo "✅ Backend running on: http://localhost:5001"
echo "✅ Frontend running on: http://localhost:3001"
echo "✅ Video linked: Lesson 159 → Media 2"
echo "✅ Students set to current lesson with video"
echo ""

echo "🎯 Testing Steps:"
echo "1. Open: http://localhost:3001/learning"
echo "2. Login (use any existing student account)"
echo "3. Expected Result:"
echo "   - Course: 'Complete AI Tools Mastery: 50 Essential Tools'"
echo "   - Lesson: '#1 ChatGPT: Tutorial & Mastery Guide'"
echo "   - Video Player: Should show with database video"
echo "   - Video should load and be playable"
echo ""

echo "🔍 If you DON'T see video:"
echo "1. Open browser Developer Tools (F12)"
echo "2. Check Console tab for errors"
echo "3. Check Network tab for failed requests"
echo "4. Common issues:"
echo "   - 401/403 errors: Authentication problem"
echo "   - 404 errors: Video file not found"
echo "   - CORS errors: Cross-origin request blocked"
echo ""

echo "📞 Quick Status Check:"
curl -s http://localhost:5001/api > /dev/null 2>&1 && echo "✅ Backend: OK" || echo "❌ Backend: Not responding"
curl -s http://localhost:3001 > /dev/null 2>&1 && echo "✅ Frontend: OK" || echo "❌ Frontend: Not responding"

echo ""
echo "🚀 Ready to test! Go to: http://localhost:3001/learning"