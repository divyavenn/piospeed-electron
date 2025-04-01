#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
cd frontend
npm install
cd ..

# Build Python executable
echo "Building Python executable..."
cd python
pyinstaller piospeed.spec
cd ..

# Copy Python dist to frontend resources
echo "Copying Python files..."
mkdir -p frontend/python
cp -r python/dist/piospeed-python/* frontend/python/

# Build Electron app
echo "Building Electron app..."
cd frontend
npm run build

echo "Build complete! Check the frontend/dist directory for the packaged application."
