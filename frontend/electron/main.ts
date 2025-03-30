import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { ChildProcess, spawn } from 'child_process';
import {setupIpcHandlers} from './ipcHandlers';
import { MessageQueue } from './messageQueue';

// Initialize the store for user preferences
const store = new Store();

// Keep a global reference of the window object and Python process
let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let messageQueue: MessageQueue | null = null; 


async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

// Function to start Python process
function startPythonProcess() {
  console.log("Starting Python process");
  // In development, the Python files are in the project directory
  // In production, they're in the resources directory
  const isDev = process.env.NODE_ENV === 'development';
  const pythonPath = isDev 
    ? path.join(process.cwd(), '../python/start.py')  // Go up one level from frontend to reach root
    : path.join(process.resourcesPath, 'python/start.py');

  console.log('Python path:', pythonPath);
  console.log('Current directory:', process.cwd());
  console.log('__dirname:', __dirname);

  try {
    // Use python3 explicitly and add -u flag for unbuffered output
    pythonProcess = spawn('python3', ['-u', pythonPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });

    // Capture stdout
    pythonProcess.stdout?.on('data', (data) => {
      console.log('Python stdout:', data.toString().trim());
    });

    // Capture stderr
    pythonProcess.stderr?.on('data', (data) => {
      console.error('Python stderr:', data.toString().trim());
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      if (messageQueue) {
        messageQueue.pythonExited();
      }
      app.exit(1);
    });

    pythonProcess.on('exit', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code !== 0) {
        app.exit(1);
      }
      pythonProcess = null;
    });

    pythonProcess.on('close', (code: number) => {
      console.log(`Python process exited with code ${code}`);
      if (messageQueue) {
        messageQueue.pythonExited();
      }
      app.exit(1);
    });

  } catch (error) {
    console.error('Error starting Python process:', error);
  }
}

// App lifecycle handlers
app.whenReady().then(async () => {
  console.log('App ready');
  
  // Start Python process first
  startPythonProcess();
  
  // Wait for Python process to create the socket
  await new Promise(resolve => setTimeout(resolve, 1000));
  

  
  // Create and connect MessageQueue
  messageQueue = new MessageQueue();
  
  // Set up event handlers before connecting
  messageQueue.on('retries-exhausted', () => {
    console.log('Connection retries exhausted, quitting app...');
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
    }
    app.quit();
  });
  
  await messageQueue.connect();
  
  // Create the window if it doesn't exist
  if (!mainWindow) {
    mainWindow = await createWindow();

    // Set up IPC handlers only once
    setupIpcHandlers(messageQueue);
  }
  
});

// Handle window close
app.on('window-all-closed', () => {
  console.log('Window closed, cleaning up...');
  
  // Stop the message queue
  if (messageQueue) {
    messageQueue.stop();
  }
  
  // Kill the Python process
  if (pythonProcess) {
    console.log('Killing Python process...');
    pythonProcess.kill();
    pythonProcess = null;
  }
  
  // Quit the app on all platforms (including macOS)
  app.quit();
});

// Handle macOS-specific event
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
