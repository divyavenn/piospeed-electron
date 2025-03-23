@echo off
echo === Installing PioSpeed ===

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js v14 or newer.
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1,2,3 delims=v." %%a in ('node -v') do set NODE_VERSION=%%b
if %NODE_VERSION% LSS 14 (
    echo Node.js version is too old. Please install Node.js v14 or newer.
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm is not installed. Please install npm.
    exit /b 1
)

echo Installing dependencies...
call npm install

echo === Setup Complete ===
echo To start the application in development mode, run: npm run dev
echo To build the application for distribution, run: npm run build 