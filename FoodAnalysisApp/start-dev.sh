#!/bin/bash

echo "🚀 Starting Food Analysis App Development Environment"

# Kill any existing Metro processes
echo "📱 Killing existing Metro processes..."
pkill -f "react-native start" || true
pkill -f "metro" || true

# Clean Metro cache
echo "🧹 Cleaning Metro cache..."
npx react-native start --reset-cache &

# Wait for Metro to start
echo "⏳ Waiting for Metro bundler to start..."
sleep 5

# Check if Metro is running
if curl -s http://localhost:8081/status > /dev/null; then
    echo "✅ Metro bundler is running!"
else
    echo "❌ Metro bundler failed to start"
    exit 1
fi

echo "🎉 Development environment ready!"
echo "📱 Now run: npx react-native run-ios"