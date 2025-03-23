#!/bin/bash

echo "=== Building PioSpeed for Windows ==="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm."
    exit 1
fi

# Check for wine on non-Windows platforms
if [[ "$OSTYPE" != "win"* ]]; then
    echo "Note: Building Windows executables on non-Windows platform."
    echo "Wine is recommended for proper icon integration and testing."
    
    if ! command -v wine &> /dev/null; then
        echo "Warning: Wine not detected. Some features like icon integration might not work properly."
    fi
fi

echo "Building application..."
npm run build:win

echo ""
echo "=== Build Complete ==="
echo "Look for the installer in the dist folder"
echo "Filename: PioSpeed-Setup-1.0.0.exe" 