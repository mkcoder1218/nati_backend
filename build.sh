#!/bin/bash

echo "🚀 Starting Render build process..."

# Print environment info
echo "📍 Current directory: $(pwd)"
echo "📍 Node.js version: $(node --version)"
echo "📍 npm version: $(npm --version)"

# Clean any existing installations
echo "🧹 Cleaning previous installations..."
rm -rf node_modules package-lock.json

# Install all dependencies (including devDependencies)
echo "📦 Installing dependencies..."
npm install --production=false

# Verify critical dependencies
echo "🔍 Verifying critical dependencies..."
if [ -d "node_modules/express" ]; then
    echo "✅ express installed"
else
    echo "❌ express missing"
    exit 1
fi

if [ -d "node_modules/typescript" ]; then
    echo "✅ typescript installed"
else
    echo "❌ typescript missing"
    exit 1
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Verify build output
if [ -d "dist" ]; then
    echo "✅ Build successful - dist directory created"
    echo "📁 Build contents:"
    ls -la dist/
else
    echo "❌ Build failed - no dist directory"
    exit 1
fi

echo "🎉 Build process completed successfully!"
