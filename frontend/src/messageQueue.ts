import * as NodeIPC from 'node-ipc';
import { EventEmitter } from 'events';

// Using require for node-ipc due to its export structure
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipc = require('node-ipc').default;

export interface Message {
  type: string;
  data: any;
}

export class MessageQueue extends EventEmitter {
  private isListening: boolean;
  private isReady: boolean = false;
  private readonly SOCKET_NAME = '/tmp/electron_python.sock';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private isStopped: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.isListening = false;
    ipc.config.id = 'electron';
    ipc.config.retry = 0;
    ipc.config.silent = false;
    ipc.config.socketRoot = '/tmp/';
    ipc.config.appspace = '';
    ipc.config.stopRetrying = true;
    ipc.config.maxRetries = 0;
    ipc.config.retry = 0;
    ipc.config.retryTimer = 0;
  }

  async connect(): Promise<void> {
    if (this.isConnected || this.isStopped) return;

    const tryConnect = (): Promise<void> =>
      new Promise((resolve, reject) => {
        if (this.isStopped) {
          reject(new Error('Connection stopped'));
          return;
        }

        // Remove any existing connection first
        if (ipc.of.python) {
          ipc.disconnect('python');
          delete ipc.of.python;
        }

        // Set up connection with custom retry handling
        ipc.connectTo('python', this.SOCKET_NAME, () => {
          if (this.isStopped) {
            ipc.disconnect('python');
            reject(new Error('Connection stopped'));
            return;
          }
          console.log("Connected to Python process");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startListening();
          resolve();
        });

        // Override node-ipc's error handling
        ipc.of.python.on('error', (error: Error) => {
          console.error("Connection error:", error);
          if (!this.isStopped) {
            reject(error);
          }
        });

        // Override node-ipc's disconnect handling
        ipc.of.python.on('disconnect', () => {
          console.log("Disconnected from Python process");
          if (!this.isStopped) {
            this.handleDisconnect();
          }
        });
      });

    try {
      await tryConnect();
    } catch (err) {
      if (this.isStopped) return;
      
      this.reconnectAttempts++;
      console.warn(`Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} failed.`);
      
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error("Max reconnection attempts reached. Giving up.");
        this.stop();
      } else {
        // Wait before next attempt
        await new Promise(res => setTimeout(res, 1000));
        if (!this.isStopped) {
          this.handleDisconnect();
        }
      }
    }
  }

  private handleDisconnect() {
    if (this.isStopped) return;
    
    this.isConnected = false;
    this.isReady = false;
    
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      // Clear any existing timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      // Set new timeout
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isStopped) {
          this.connect();
        }
      }, 1000);
    } else {
      console.log('Max reconnection attempts reached');
      this.stop();
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening || this.isStopped) return;
    this.isListening = true;

    ipc.of.python.on('message', (data: Message) => {
      if (data.type === 'ready') {
        console.log('Python process is ready');
        this.isReady = true;
        this.emit('ready');
      } else {
        this.emit('message', data);
      }
    });
  }

  async send(message: Message): Promise<void> {
    if (!this.isConnected || this.isStopped) {
      console.warn('Not connected to Python process');
      return;
    }

    if (!this.isListening || !this.isReady) {
      console.warn('Not ready to send message');
      return;
    }

    try {
      ipc.of.python.emit('message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      this.handleDisconnect();
      throw error;
    }
  }

  stop(): void {
    this.isStopped = true;
    this.isListening = false;
    this.isConnected = false;
    this.isReady = false;
    
    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Force disconnect from node-ipc
    if (ipc.of.python) {
      ipc.disconnect('python');
      delete ipc.of.python;
    }

    // Additional cleanup to ensure no lingering connections
    try {
      if (ipc.of.python) {
        delete ipc.of.python;
      }
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  }
}