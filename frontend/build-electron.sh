#!/bin/bash
set -e

echo "Building PioSpeed Electron App..."

# Ensure we're in the frontend directory
cd "$(dirname "$0")"

# Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf dist dist-electron

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the React app and Electron app together
echo "Building React and Electron app..."
npm run build

echo "Build completed successfully!"
echo "Your distributables are in the 'dist' directory." 