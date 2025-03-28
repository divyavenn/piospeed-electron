import * as NodeIPC from 'node-ipc';
import { EventEmitter } from 'events';

// Using require for node-ipc due to its export structure
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipc = require('node-ipc').default;

export interface Message {
  type: string;
  data: any;
}

// Connection states
enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  READY,
  STOPPED
}

export class MessageQueue extends EventEmitter {
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private readonly SOCKET_NAME = '/tmp/electron_python.sock';
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    // Configure IPC once
    ipc.config.id = 'electron';
    ipc.config.silent = false;
    ipc.config.socketRoot = '/tmp/';
    ipc.config.appspace = '';
    ipc.config.stopRetrying = true;
    ipc.config.maxRetries = 0;
    ipc.config.retryTimer = 0;
  }

  async connect(): Promise<void> {
    // Don't attempt to connect if already connected or connecting or stopped
    if (this.state !== ConnectionState.DISCONNECTED) return;
    
    this.state = ConnectionState.CONNECTING;

    try {
      await this.tryConnect();
    } catch (err) {
      this.reconnectAttempts++;
      console.warn(`Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} failed.`);
      
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error("Max reconnection attempts reached. Giving up.");
        this.stop();
      } else {
        // Schedule reconnect
        this.scheduleReconnect();
      }
    }
  }

  private tryConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up any existing connection
      if (this.state === ConnectionState.STOPPED) return;
      this.cleanupExistingConnection();

      // Set up connection
      ipc.connectTo('python', this.SOCKET_NAME, () => {
        if (this.state === ConnectionState.STOPPED) {
          ipc.disconnect('python');
          reject(new Error('Connection stopped'));
          return;
        }
        
        console.log("Connected to Python process");
        this.state = ConnectionState.CONNECTED;
        this.reconnectAttempts = 0;
        this.setupListeners();
        resolve();
      });
    });
  }

  private cleanupExistingConnection(): void {
    if (ipc.of.python) {
      ipc.disconnect('python');
      delete ipc.of.python;
    }
  }

  private setupListeners(): void {
    // Message handler
    ipc.of.python.on('message', (data: Message) => {
      if (data.type === 'ready') {
        console.log('Python process is ready');
        this.state = ConnectionState.READY;
        this.emit('ready');
      } else {
        this.emit('message', data);
      }
    });

    // Error handler
    ipc.of.python.on('error', (error: Error) => {
      console.error("Connection error:", error);
      if (this.state !== ConnectionState.STOPPED) {
        this.handleDisconnect();
      }
    });

    // Disconnect handler
    ipc.of.python.on('disconnect', () => {
      console.log("Disconnected from Python process");
      if (this.state !== ConnectionState.STOPPED) {
        this.handleDisconnect();
      }
    });
  }

  private handleDisconnect(): void {
    if (this.state === ConnectionState.STOPPED) return;
    
    this.state = ConnectionState.DISCONNECTED;
    
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    } else {
      console.log('Max reconnection attempts reached');
      this.stop();
    }
  }

  private scheduleReconnect(): void {
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Set new timeout
    this.reconnectTimeout = setTimeout(() => {
      if (this.state !== ConnectionState.STOPPED) {
        this.connect();
      }
    }, 1000);
  }

  async send(message: Message): Promise<void> {
    if (this.state !== ConnectionState.READY) {
      console.warn(`Cannot send message: not ready (current state: ${ConnectionState[this.state]})`);
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
    this.state = ConnectionState.STOPPED;
    
    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.cleanupExistingConnection();
  }
}