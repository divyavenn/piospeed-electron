import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { spawn, ChildProcess } from 'child_process';
import { 
  checkPythonInstalled, 
  installPythonDependencies, 
  getPythonExecutable,
  getEmbeddedPythonPath
} from './python-setup';

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
// Keep a reference to the Python process
let pythonProcess: ChildProcess | null = null;

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
    // Use these options for a more native feel
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0A0F1F', // Dark theme color
    show: false,
  });

  // Check if Python is installed
  const isPythonInstalled = await checkPythonInstalled();
  if (!isPythonInstalled) {
    dialog.showErrorBox(
      'Python Not Found',
      'Python 3 is required to run this application. Please install Python 3 and try again.'
    );
    app.quit();
    return;
  }
  
  // Install Python dependencies if needed
  await installPythonDependencies(app.getAppPath());

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

  // Create application menu
  createApplicationMenu();
}

/**
 * Create the application menu
 */
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  
  // Template for the menu
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Select Solver Path',
          click: async () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:select-solver');
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Instructions',
          click: async () => {
            const instructionsPath = app.isPackaged
              ? path.join(process.resourcesPath, 'public', 'instructions.html')
              : path.join(app.getAppPath(), 'public', 'instructions.html');
              
            if (fs.existsSync(instructionsPath)) {
              shell.openExternal(`file://${instructionsPath}`);
            } else {
              dialog.showErrorBox(
                'Instructions Not Found',
                'The instructions file could not be found.'
              );
            }
          }
        },
        {
          label: 'About PioSpeed',
          click: async () => {
            dialog.showMessageBox({
              title: 'About PioSpeed',
              message: 'PioSpeed',
              detail: 'Version 1.0.0\nAn Electron-based interface for PioSOLVER.'
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
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

// Make sure to kill the Python process when quitting
app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Function to start the Python process
function startPythonProcess() {
  try {
    // Determine the Python executable - first try embedded, then fall back to system
    const pythonExecutable = getEmbeddedPythonPath() || getPythonExecutable();
    
    // Determine the path to the Python script based on whether we're in development or production
    let pythonScriptPath;
    let mappingsPath;
    
    // Get the app path and check if it already ends with 'frontend'
    const appPath = app.getAppPath();
    const frontendPath = appPath.endsWith('frontend') ? appPath : path.join(appPath, 'frontend');
    
    if (app.isPackaged) {
      // Production path - executable is in the app.asar
      pythonScriptPath = path.join(process.resourcesPath, 'python', 'electron_bridge.py');
      mappingsPath = path.join(process.resourcesPath, 'public', 'mappings');
    } else {
      // Development path - use local directory
      pythonScriptPath = path.join(frontendPath, 'python', 'electron_bridge.py');
      mappingsPath = path.join(frontendPath, 'public', 'mappings');
    }
    
    console.log('App path:', appPath);
    console.log('Frontend path:', frontendPath);
    console.log('Python executable:', pythonExecutable);
    console.log('Python script path:', pythonScriptPath);
    console.log('Mappings path:', mappingsPath);
    
    // Check if the script exists
    if (!fs.existsSync(pythonScriptPath)) {
      console.error(`Python script not found at: ${pythonScriptPath}`);
      throw new Error(`Python script not found at: ${pythonScriptPath}`);
    }
    
    // Check if mappings directory exists
    if (!fs.existsSync(mappingsPath)) {
      console.warn(`Mappings directory not found at: ${mappingsPath}`);
    }
    
    // Environment variables for the Python process
    const env = { 
      ...process.env,
      PIOSPEED_MAPPINGS_PATH: mappingsPath
    };
    
    // Spawn the Python process
    const childProcess = spawn(pythonExecutable, [pythonScriptPath], { 
      env,
      stdio: ['pipe', 'pipe', 'pipe'] // Enable stdin, stdout, stderr
    });
    
    // Decode output from Python as UTF-8
    childProcess.stdout.setEncoding('utf8');
    childProcess.stderr.setEncoding('utf8');
    
    let stdoutBuffer = '';
    
    // Handle Python process stdout
    childProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      stdoutBuffer += dataStr;
      
      // Process complete JSON messages
      let jsonStart = 0;
      let jsonEnd = stdoutBuffer.indexOf('\n', jsonStart);
      
      while (jsonEnd !== -1) {
        const jsonStr = stdoutBuffer.substring(jsonStart, jsonEnd).trim();
        if (jsonStr) {
          try {
            const message = JSON.parse(jsonStr);
            handlePythonMessage(message);
          } catch (error) {
            console.error('Error parsing JSON from Python:', error, jsonStr);
          }
        }
        
        jsonStart = jsonEnd + 1;
        jsonEnd = stdoutBuffer.indexOf('\n', jsonStart);
      }
      
      // Keep any remaining incomplete data
      stdoutBuffer = stdoutBuffer.substring(jsonStart);
    });
    
    // Handle Python process stderr
    childProcess.stderr.on('data', (data) => {
      console.log('Python stderr:', data.toString());
    });
    
    // Handle Python process exit
    childProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      pythonProcess = null;
      
      // Notify frontend if code is non-zero (error)
      if (code !== 0 && mainWindow) {
        mainWindow.webContents.send('python:error', {
          message: `Python process exited with code ${code}`
        });
      }
    });
    
    // Handle Python process errors
    childProcess.on('error', (error) => {
      console.error('Error starting Python process:', error);
      pythonProcess = null;
      
      if (mainWindow) {
        mainWindow.webContents.send('python:error', {
          message: `Failed to start Python process: ${error.message}`
        });
      }
    });
    
    return childProcess;
  } catch (error) {
    console.error('Error starting Python process:', error);
    dialog.showErrorBox(
      'Python Error',
      `Failed to start Python process: ${error.message}`
    );
    return null;
  }
}

/**
 * Handle messages received from the Python process
 */
function handlePythonMessage(message: any) {
  if (!mainWindow) {
    console.error('No main window available to send message to');
    return;
  }
  
  const messageType = message.type;
  const data = message.data;
  
  console.log('Received message from Python:', messageType);
  
  switch (messageType) {
    case 'ready':
      console.log('Python bridge is ready');
      break;
      
    case 'output':
      mainWindow.webContents.send('python:output', data);
      break;
      
    case 'error':
      mainWindow.webContents.send('python:error', data);
      break;
      
    case 'step_update':
      mainWindow.webContents.send('python:step-update', data);
      break;
      
    case 'request_input':
      mainWindow.webContents.send('python:request-input', data);
      break;
      
    case 'commands':
      mainWindow.webContents.send('python:commands', data);
      break;
      
    case 'init_complete':
      mainWindow.webContents.send('python:init-complete', data);
      break;
      
    case 'command_complete':
      mainWindow.webContents.send('python:command-complete', data);
      break;
      
    case 'input_received':
      mainWindow.webContents.send('python:input-received', data);
      break;
      
    default:
      console.warn('Unknown message type from Python:', messageType);
  }
}

/**
 * Send a message to the Python process
 */
function sendToPython(action: string, data: any = {}) {
  if (!pythonProcess) {
    console.error('No Python process running');
    return false;
  }
  
  try {
    const message = JSON.stringify({
      action,
      ...data
    });
    
    pythonProcess.stdin.write(message + '\n');
    return true;
  } catch (error) {
    console.error('Error sending message to Python:', error);
    return false;
  }
}

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

// Initialize the Python-based solver
ipcMain.handle('init-solver', async (_, solverPath) => {
  try {
    if (!pythonProcess) {
      pythonProcess = startPythonProcess();
    }
    
    if (!pythonProcess) {
      throw new Error('Failed to start Python process');
    }
    
    // Send the init command to the Python process
    sendToPython('init', { solverPath });
    
    return { success: true, message: 'Solver initialization requested' };
  } catch (error) {
    console.error('Error initializing solver:', error);
    return { success: false, message: error.message };
  }
});

// Execute a command
ipcMain.handle('execute-command', async (_, solverPath, command, args) => {
  try {
    if (!pythonProcess) {
      pythonProcess = startPythonProcess();
    }
    
    if (!pythonProcess) {
      throw new Error('Failed to start Python process');
    }
    
    // Send the run_command to the Python process
    sendToPython('run_command', { solverPath, command, args });
    
    return { success: true, message: 'Command execution requested' };
  } catch (error) {
    console.error('Error executing command:', error);
    return { success: false, message: error.message };
  }
});

// Get the list of available commands
ipcMain.handle('get-commands', async () => {
  try {
    if (!pythonProcess) {
      pythonProcess = startPythonProcess();
    }
    
    if (!pythonProcess) {
      throw new Error('Failed to start Python process');
    }
    
    // Send the get_commands request to the Python process
    sendToPython('get_commands');
    
    return { success: true, message: 'Commands requested' };
  } catch (error) {
    console.error('Error getting commands:', error);
    return { success: false, message: error.message };
  }
});

// Send user input to the Python process
ipcMain.handle('send-input-to-python', async (_, input) => {
  try {
    if (!pythonProcess) {
      return { success: false, message: 'No Python process running' };
    }
    
    // Send the input to the Python process
    sendToPython('input', { input });
    
    return { success: true, message: 'Input sent to Python' };
  } catch (error) {
    console.error('Error sending input to Python:', error);
    return { success: false, message: error.message };
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