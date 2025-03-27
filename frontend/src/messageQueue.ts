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
  private connectionAttempts: number = 0;
  private readonly MAX_RETRIES = 5;
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.isListening = false;
    ipc.config.id = 'electron';
    ipc.config.retry = 1500;
    ipc.config.silent = false;
    ipc.config.socketRoot = '/tmp/';
    ipc.config.appspace = '';
  }

  async connect(): Promise<void> {
    ipc.connectTo('python', this.SOCKET_NAME, () => {
      console.log("Connected to Python process");
      this.startListening();
    });
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;
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

    ipc.of.python.on('error', (error: Error) => {
      console.error("Error receiving message:", error);
      this.emit('error', error);
    });
  }

  async send(message: Message): Promise<void> {
    if (!this.isListening || !this.isReady) {
      console.warn('Not connected or Python process not ready, message not sent');
      return;
    }
    ipc.of.python.emit('message', message);
  }

  stop(): void {
    this.isListening = false;
    ipc.disconnect('python');
  }
}