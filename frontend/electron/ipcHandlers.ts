import {BrowserWindow, ipcMain } from 'electron';
import {MessageQueue, ConnectionState} from './messageQueue';
import Store from 'electron-store';

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
    console.log('Received message from Python:', data);
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
    return messageQueue.getConnectionState();
  });
}