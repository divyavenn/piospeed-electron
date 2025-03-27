export function setupIpcHandlers(messageQueue: MessageQueue, store: Store): void {
  // Handle Python messages
  messageQueue.on('message', (data: any) => {
    console.log('Received message:', data);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('python-message', data);
    });
  });

  // Handle solver path requests
  ipcMain.handle('get-solver-path', async () => {
    try {
      const solverPath = store.get('solverPath');
      if (!solverPath) {
        throw new Error('Solver path not set');
      }
      return solverPath;
    } catch (error) {
      console.error('Error getting solver path:', error);
      throw error;
    }
  });

  // Handle solver path updates
  ipcMain.handle('set-solver-path', async (_, path: string) => {
    try {
      store.set('solverPath', path);
      return true;
    } catch (error) {
      console.error('Error setting solver path:', error);
      throw error;
    }
  });
} 