import {BrowserWindow, ipcMain, dialog } from 'electron';
import {MessageQueue, ConnectionState} from './messageQueue';
import Store from 'electron-store';
import { AppSettings } from '../src/components/Settings/SettingsModal';

/**
 * Sets up IPC handlers for communication between the renderer process and the main process.
 * 
 * @param messageQueue The message queue used for communication with Python.
 * @param store The Electron store used for storing application data.
 */
export function setupIpcHandlers(messageQueue: MessageQueue, store: Store): void {
  /**
   * Handler for sending messages from the renderer process to Python.
   * 
   * Direction: Renderer → Main → Python
   * React app calls window.electron.sendToPython()
   * → ipcMain.handle('send-to-python', ...)
   * → messageQueue.send(message)
   * → Python receives message
   */
  ipcMain.handle('send-to-python', async (_, message) => {
    try {
      await messageQueue.send(message);
    } catch (error) {
      console.error('Failed to send message to Python:', error);
    }
  });

  /**
   * Handler for receiving messages from Python and forwarding them to the renderer process.
   * 
   * Direction: Python → Main → Renderer
   * Python sends a message
   * → messageQueue emits 'message' event
   * → messageQueue.on('message', ...)
   * → window.webContents.send('python-message', ...)
   * → React app's callback is triggered via onPythonMessage
   */
  messageQueue.on('message', (data: any) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('python-message', data);
    });
  });

  /**
   * Handler for forwarding connection state changes from the message queue to the renderer process.
   * 
   * Direction: Main → Renderer
   * Connection state changes in messageQueue
   * → messageQueue emits 'connection-state-change' event
   * → messageQueue.on('connection-state-change', ...)
   * → window.webContents.send('connection-state-change', ...)
   * → React app's callback is triggered via onConnectionStateChange
   */
  messageQueue.on('connection-state-change', (state: ConnectionState) => {
    console.log('Connection state changed:', ConnectionState[state]);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('connection-state-change', state);
    });
  });

  /**
   * Handler for getting the current connection state from the message queue.
   * 
   * Direction: Renderer → Main
   * React app calls window.electron.getConnectionState()
   * → ipcMain.handle('get-connection-state', ...)
   * → Returns the current connection state from messageQueue
   * → React app receives the state as a Promise result
   */
  ipcMain.handle('get-connection-state', () => {
    return ConnectionState[messageQueue.getConnectionState()];
  });

  /**
   * Handler for updating application settings
   * 
   * Direction: Renderer → Main
   * React app calls window.electron.setSettings(settings)
   * → ipcMain.handle('set-settings', ...)
   * → Updates all specified settings in the electron-store
   * → React app receives a confirmation as a Promise result
   */
  ipcMain.handle('set-settings', (_, settings: Partial<AppSettings>) => {
    try {
      Object.entries(settings).forEach(([key, value]) => {
        store.set(key as keyof AppSettings, value);
      });
      return { success: true, message: 'Settings updated successfully' };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: String(error) };
    }
  });
  
  /**
   * Handler for retrieving application settings
   * 
   * Direction: Renderer → Main
   * React app calls window.electron.retrieveSettings()
   * → ipcMain.handle('retrieve-settings', ...)
   * → Returns all settings from the electron-store
   * → React app receives the settings object as a Promise result
   */
  ipcMain.handle('retrieve-settings', () => {
    // Get all settings related to the application
    return {
      solverPath: store.get('solverPath') || null,
      cfrFolder: store.get('cfrFolder') || null,
      weights: store.get('weights') || null,
      nodeBook: store.get('nodeBook') || null,
      accuracy: store.get('accuracy') || 0.02,
    };
  });

  /**
   * Handler for opening a file or directory selection dialog
   * 
   * Direction: Renderer → Main
   * React app calls window.electron.selectPath({ type, defaultPath, filters })
   * → ipcMain.handle('select-path', ...)
   * → Opens a native file/directory dialog via dialog.showOpenDialog
   * → Returns the selected path to the renderer
   */
  ipcMain.handle('select-path', async (_, options) => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    
    if (!mainWindow) {
      throw new Error('No focused window found');
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      ...options,
      properties: options.type === 'both' 
        ? ['openFile', 'openDirectory'] 
        : [options.type === 'file' ? 'openFile' : 'openDirectory']
    });
    return result.filePaths[0] || null;
  });

  /**
   * Handler for showing error dialogs
   */
  ipcMain.handle('show-error', async (_, message) => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    
    if (!mainWindow) {
      throw new Error('No focused window found');
    }
    
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Error',
      message: message,
      buttons: ['OK']
    });
  });
}