#!/bin/bash

echo "🔍 Debugging LearnAI Video System..."

# Check if servers are accessible
echo "📡 Testing server connectivity:"

# Test backend
if curl -s --connect-timeout 3 http://localhost:5001/api > /dev/null 2>&1; then
    echo "✅ Backend (5001) - Accessible"
else
    echo "❌ Backend (5001) - Not accessible"
fi

# Test frontend
if curl -s --connect-timeout 3 http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend (3001) - Accessible"
else
    echo "❌ Frontend (3001) - Not accessible"
fi

echo ""
echo "🎯 Next Steps to Debug Videos:"
echo "1. Open browser to http://localhost:3001"
echo "2. Login as admin/student"
echo "3. Go to /admin to check uploaded videos"
echo "4. Go to /learning to see what videos appear"
echo "5. Use browser developer tools to check console errors"

echo ""
echo "🔧 Quick Fixes to Try:"
echo "1. If no videos uploaded: Use admin panel to upload test video"
echo "2. If videos exist but not showing: Check lesson videoUrl format"
echo "3. If authentication errors: Check browser localStorage for token"
echo "4. If URL format errors: Should be '/api/media/{number}'"

echo ""
echo "📱 Test URLs:"
echo "- Admin Panel: http://localhost:3001/admin"
echo "- Learning Page: http://localhost:3001/learning"
echo "- Test Page: file://$(pwd)/test-video-playback.html"