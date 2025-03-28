import {BrowserWindow, ipcMain } from 'electron';
import {MessageQueue} from './messageQueue';
import Store from 'electron-store';

export function setupIpcHandlers(messageQueue: MessageQueue, store: Store): void {
    ipcMain.handle('send-to-python', async (_, message) => {
        try {
            await messageQueue.send(message);
        } catch (error) {
            console.error('Failed to send message to Python:', error);
        }
    });

    // Handle Python messages
    messageQueue.on('message', (data: any) => {
        console.log('Received message from Python:', data);
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('python-message', data);
        });
    });

} 