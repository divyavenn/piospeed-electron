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
 
    // Initialize and start the message queue
  messageQueue = new MessageQueue();
  messageQueue.connect().catch((error: Error) => {
      console.error('Failed to connect message queue:', error);
  });

  // Listen for messages
  messageQueue.on('message', (data: any) => {
      console.log('Received message:', data);
      // You can send messages to your renderer process here
      mainWindow?.webContents.send('python-message', data);
  });

}




// App lifecycle handlers
app.whenReady().then(()=>{
  console.log("App ready");
  createWindow();
  setupIpcHandlers(messageQueue, store);
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

