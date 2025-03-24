import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { spawn } from 'child_process';

// Initialize the store for user preferences
const store = new Store();

// Keep a global reference of the window object and Python process
let mainWindow: BrowserWindow | null = null;
let pythonProcess: any = null;

// Function to start Python process
function startPythonProcess() {
  const pythonPath = path.join(__dirname, '../python/start.py');
  pythonProcess = spawn('python', [pythonPath]);

  pythonProcess.stdout.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      try {
        const message = JSON.parse(output);
        if (message.type === 'output') {
          mainWindow?.webContents.send('python:output', message.message);
        } else if (message.type === 'step_update') {
          mainWindow?.webContents.send('python:step-update', message.step);
        }
      } catch (e) {
        console.log('Python output:', output);
      }
    }
  });

  pythonProcess.stderr.on('data', (data: Buffer) => {
    console.error('Python error:', data.toString());
    mainWindow?.webContents.send('python:error', data.toString());
  });

  pythonProcess.on('close', (code: number) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// Function to send solver path to Python
function sendSolverPathToPython(solverPath: string) {
  if (pythonProcess) {
    pythonProcess.stdin.write(`SET_SOLVER_PATH:${solverPath}\n`);
  }
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

  // Start Python process
  startPythonProcess();

  // Send initial solver path if it exists
  const solverPath = store.get('solverPath');
  if (solverPath) {
    sendSolverPathToPython(solverPath as string);
  }
}

// IPC Handlers
ipcMain.handle('get-solver-path', () => {
  return store.get('solverPath');
});

ipcMain.handle('get-folder-path', (_, options) => {
  return store.get(options.key);
});

ipcMain.handle('save-folder-path', (_, options) => {
  store.set(options.key, options.path);
});

ipcMain.on('send-solver-path', (_, path) => {
  sendSolverPathToPython(path);
});

ipcMain.handle('select-solver-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['exe'] }]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const solverPath = result.filePaths[0];
    store.set('solverPath', solverPath);
    sendSolverPathToPython(solverPath);
    return solverPath;
  }
  return null;
});

ipcMain.handle('select-file', async (_, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters || []
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// App lifecycle handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

