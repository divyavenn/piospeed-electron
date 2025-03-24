@echo off
echo Building PioSpeed Electron App...

rem Ensure we're in the frontend directory
cd /d "%~dp0"

rem Clean up previous builds
echo Cleaning up previous builds...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron

rem Install dependencies if needed
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

rem Build the React app
echo Building React app...
call npm run build

echo Build completed successfully!
echo Your distributables are in the 'dist' directory. 