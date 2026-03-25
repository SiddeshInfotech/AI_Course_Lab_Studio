#!/bin/bash

echo "🧪 TESTING VIDEO SIGNED URL GENERATION"
echo ""

# Test if we can generate a signed URL directly
echo "📡 Testing Backend API directly..."

# First test basic API connectivity
echo "1. Testing basic API connection:"
if curl -s http://localhost:5001/api > /dev/null 2>&1; then
    echo "✅ Backend API responding"
else
    echo "❌ Backend API not responding"
    exit 1
fi

# Test login to get token
echo ""
echo "2. Testing admin login:"
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    echo "✅ Admin login successful"
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:20}..."
else
    echo "❌ Admin login failed"
    echo "   Response: $TOKEN_RESPONSE"
    exit 1
fi

# Test signed URL generation
echo ""
echo "3. Testing signed URL generation for Media ID 2:"
SIGNED_URL_RESPONSE=$(curl -s -X POST http://localhost:5001/api/media/2/signed-url \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600000, "accessType": "view"}')

echo "   Response: $SIGNED_URL_RESPONSE"

if echo "$SIGNED_URL_RESPONSE" | grep -q "signedUrl"; then
    echo "✅ Signed URL generated successfully"

    # Extract the signed URL
    SIGNED_URL=$(echo "$SIGNED_URL_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "   URL: $SIGNED_URL"

    # Test if we can access the signed URL
    echo ""
    echo "4. Testing signed URL access:"
    if curl -s --head "$SIGNED_URL" | head -1 | grep -q "200"; then
        echo "✅ Signed URL is accessible"
    else
        echo "❌ Signed URL access failed"
        curl -s --head "$SIGNED_URL" | head -3
    fi

else
    echo "❌ Signed URL generation failed"
    echo "   Full response: $SIGNED_URL_RESPONSE"
fi

echo ""
echo "🔍 DIAGNOSIS:"
echo "If signed URL works but video still doesn't play in browser:"
echo "1. Check browser console for JavaScript errors"
echo "2. Check if authentication token is properly stored in localStorage"
echo "3. Verify the React component is calling the correct API endpoints"
echo "4. Try opening the signed URL directly in browser"