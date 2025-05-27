#!/bin/bash

echo "Starting Render build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Verify build output
echo "Verifying build output..."
if [ -f "dist/index.js" ]; then
    echo "✅ Build successful! dist/index.js found"
    ls -la dist/
else
    echo "❌ Build failed! dist/index.js not found"
    echo "Contents of current directory:"
    ls -la
    echo "Contents of dist directory (if exists):"
    ls -la dist/ || echo "dist directory does not exist"
    exit 1
fi

echo "Build process completed successfully!"
