import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { spawn } from 'child_process';

// Initialize the store for user preferences
const store = new Store();

// Prepare for hot reload in development
if (process.env.NODE_ENV === 'development') {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit();
      }
    });
  } else {
    process.on('SIGTERM', () => {
      app.quit();
    });
  }
}

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Use these options for a more native feel
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0A0F1F', // Dark theme color
    show: false,
  });

  // Load the entry point for the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    // Load the index.html of the app in production
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for communication with renderer
// Select PioSOLVER executable
ipcMain.handle('select-solver-path', async () => {
  if (!mainWindow) return null;

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (canceled || filePaths.length === 0) {
    return null;
  } else {
    // Save the selected solver path to the store
    store.set('solverPath', filePaths[0]);
    return filePaths[0];
  }
});

// Get stored solver path
ipcMain.handle('get-solver-path', () => {
  return store.get('solverPath');
});

// Select a file
ipcMain.handle('select-file', async (_, options) => {
  if (!mainWindow) return null;

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters || []
  });
  
  if (canceled || filePaths.length === 0) {
    return null;
  } else {
    return filePaths[0];
  }
});

// Select a folder
ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (canceled || filePaths.length === 0) {
    return null;
  } else {
    return filePaths[0];
  }
});

// Execute solver commands
ipcMain.handle('run-solver-command', async (_, { solverPath, command, args }) => {
  if (!fs.existsSync(solverPath)) {
    return { success: false, error: 'Solver executable not found.' };
  }

  try {
    return new Promise((resolve, reject) => {
      const process = spawn(solverPath, [command, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
        mainWindow?.webContents.send('solver-output', data.toString());
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        mainWindow?.webContents.send('solver-error', data.toString());
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject({ success: false, code, stdout, stderr });
        }
      });
    });
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Save paths for frequently used folders
ipcMain.handle('save-folder-path', (_, { key, path }) => {
  store.set(`folders.${key}`, path);
  return true;
});

// Get stored folder paths
ipcMain.handle('get-folder-path', (_, { key }) => {
  return store.get(`folders.${key}`);
}); 