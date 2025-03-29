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
export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  READY,
  STOPPED
}

export class MessageQueue extends EventEmitter {
  private _state: ConnectionState = ConnectionState.DISCONNECTED;
  private readonly SOCKET_NAME = '/tmp/electron_python.sock';
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pythonProcessExited: boolean = false;

  constructor() {
    super();
    
    // Configure IPC once
    ipc.config.id = 'electron';
    ipc.config.silent = false;
    ipc.config.socketRoot = '/tmp/';
    ipc.config.appspace = '';
    ipc.config.stopRetrying = false;  // Allow retries
    ipc.config.maxRetries = 3;        // Limit retries to 3
    ipc.config.retryTimer = 1000;     // Retry every second
    ipc.config.rawBuffer = true;      // Enable raw buffer mode
    ipc.config.encoding = 'utf8';     // Ensure consistent encoding
    ipc.config.maxConnections = 1;    // Only need one connection
    ipc.config.sync = false;          // Async mode
  }

  // Add getter and setter for state to emit events when state changes
  private get state(): ConnectionState {
    return this._state;
  }

  private set state(newState: ConnectionState) {
    if (this._state !== newState) {
      const oldState = this._state;
      this._state = newState;
      console.log(`Connection state changed: ${ConnectionState[oldState]} -> ${ConnectionState[newState]}`);
      this.emit('connection-state-change', newState);
    }
  }

  // Get current connection state
  public getConnectionState(): ConnectionState {
    return this._state;
  }

  // Called when Python process exits
  public pythonExited(): void {
    console.log("Python process has exited, stopping reconnection attempts");
    this.pythonProcessExited = true;
    this.stop();
  }

  async connect(): Promise<void> {
    // Don't attempt to connect if already connected or connecting or stopped
    if (this.state !== ConnectionState.DISCONNECTED || this.pythonProcessExited) return;
    
    this.state = ConnectionState.CONNECTING;

    try {
      await this.tryConnect();
    } catch (err) {
      // If Python has exited, don't try to reconnect
      if (this.pythonProcessExited) {
        this.stop();
        return;
      }

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
      if (this.state === ConnectionState.STOPPED || this.pythonProcessExited) {
        reject(new Error('Connection stopped'));
        return;
      }
      
      this.cleanupExistingConnection();

      // Set up connection
      ipc.connectTo('python', this.SOCKET_NAME, () => {
        if (this.state === ConnectionState.STOPPED || this.pythonProcessExited) {
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
    // Socket data handler for raw data
    ipc.of.python.on('data', (buffer: Buffer) => {
      try {
        const messageStr = buffer.toString().trim();
        if (!messageStr) return;
      
        
        const messages = messageStr.split('\n').filter(msg => msg.trim());
        
        for (const msg of messages) {
          try {
            const message = JSON.parse(msg);
            console.log('Parsed message:', message);
            
            if (message.type === 'ready') {
              this.state = ConnectionState.READY;
            }
            
            this.emit('message', message);
          } catch (e) {
            console.error('Failed to parse message part:', msg, e);
          }
        }
      } catch (error) {
        console.error('Error processing socket data:', error);
      }
    });

    // Socket connect handler
    ipc.of.python.on('connect', () => {
      console.log('Socket connected to Python');
    });

    // Error handler
    ipc.of.python.on('error', (error: Error) => {
      console.error("Connection error:", error);
      if (this.state !== ConnectionState.STOPPED && !this.pythonProcessExited) {
        this.handleDisconnect();
      }
    });

    // Disconnect handler
    ipc.of.python.on('disconnect', () => {
      console.log("Disconnected from Python process");
      if (this.state !== ConnectionState.STOPPED && !this.pythonProcessExited) {
        this.handleDisconnect();
      }
    });

    // Socket error handler
    ipc.of.python.on('socket.error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }

  private handleDisconnect(): void {
    if (this.state === ConnectionState.STOPPED || this.pythonProcessExited) return;
    
    this.state = ConnectionState.DISCONNECTED;
    
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS && !this.pythonProcessExited) {
      this.scheduleReconnect();
    } else {
      console.log('Max reconnection attempts reached or Python process exited');
      this.stop();
    }
  }

  private scheduleReconnect(): void {
    // Don't schedule reconnection if Python has exited
    if (this.pythonProcessExited) {
      this.stop();
      return;
    }
    
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Set new timeout
    this.reconnectTimeout = setTimeout(() => {
      if (this.state !== ConnectionState.STOPPED && !this.pythonProcessExited) {
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