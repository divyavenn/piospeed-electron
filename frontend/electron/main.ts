import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { ChildProcess, spawn } from 'child_process';
import {setupIpcHandlers} from '../src/ipcHandlers';
import { MessageQueue } from '../src/messageQueue';

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
}

// Function to start Python process
function startPythonProcess() {
  console.log("Starting Python process");
  // In development, the Python files are in the project directory
  // In production, they're in the resources directory
  const isDev = process.env.NODE_ENV === 'development';
  const pythonPath = isDev 
    ? path.join(__dirname, '../../python/start.py')
    : path.join(process.resourcesPath, 'python/start.py');

  pythonProcess = spawn('python', [pythonPath]);

  pythonProcess.on('close', (code: number) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// App lifecycle handlers
app.whenReady().then(async () => {
  console.log("App ready");
  
  // Initialize and start the message queue first
  messageQueue = new MessageQueue();
  await messageQueue.connect().catch((error: Error) => {
    console.error('Failed to connect message queue:', error);
  });

  // Create window and setup handlers
  createWindow();
  setupIpcHandlers(mainWindow!, messageQueue!, store);

  // Start Python process last
  startPythonProcess();
});

app.on('window-all-closed', () => {
  if (messageQueue) {
    messageQueue.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

