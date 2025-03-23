@echo off
echo === Building PioSpeed for Windows ===

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm is not installed. Please install npm.
    exit /b 1
)

echo Building application...
call npm run build:win

echo.
echo === Build Complete ===
echo Look for the installer in the dist folder
echo Filename: PioSpeed-Setup-1.0.0.exe
pause 