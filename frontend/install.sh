#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v14 or newer."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d. -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Node.js version is too old. Please install Node.js v14 or newer."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm."
    exit 1
fi

echo "=== Installing PioSpeed ==="
echo "Installing dependencies..."
npm install

echo "=== Setup Complete ==="
echo "To start the application in development mode, run: npm run dev"
echo "To build the application for distribution, run: npm run build" 