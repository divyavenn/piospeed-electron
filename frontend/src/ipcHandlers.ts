import { BrowserWindow, ipcMain, dialog } from 'electron';
import { MessageQueue } from './messageQueue';
import Store from 'electron-store';

export function setupIpcHandlers(mainWindow: BrowserWindow, messageQueue: MessageQueue, store: Store) {
    ipcMain.handle('send-to-python', async (_, message) => {
        try {
            await messageQueue.send(message);
        } catch (error) {
            console.error('Failed to send message to Python:', error);
        }
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

    // Add other handlers here
    ipcMain.handle('get-solver-path', async () => {
        return store.get('solverPath');
    });

    // Handle regular Python messages
    messageQueue.on('message', (data: any) => {
      console.log('Received message from Python:', data);
      mainWindow?.webContents.send('python-message', data);
    });
}