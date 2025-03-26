const zmq = require('zeromq');

class ZMQService {
  constructor() {
    this.python = 'tcp://127.0.0.1:5555';
    this.react = 'tcp://127.0.0.1:5556';

    // Request socket for sending commands (matches Python's REP)
    this.requestSocket = zmq.socket('req');
    this.requestSocket.connect(this.python);

    // Subscribe socket for receiving notifications (matches Python's PUB)
    this.subscribeSocket = zmq.socket('sub');
    this.subscribeSocket.connect(this.react);
    this.subscribeSocket.subscribe('');

    // Handle incoming notifications
    this.subscribeSocket.on('message', (topic, message) => {
      const topicStr = topic.toString();
      const messageStr = message.toString();
      const data = JSON.parse(messageStr);
      console.log(`Received ${topicStr}:`, data);
      // Handle the message (e.g., update UI)
    });
  }

  async handleSettingsRequest(data) {
    try {
      const { type } = JSON.parse(data);
      if (type === 'get_solver_path') {
        // Get solver path from electron store
        const solverPath = await window.electron.getSolverPath();
        this.requestSocket.send(JSON.stringify({ solver_path: solverPath }));
      }
    } catch (error) {
      console.error('Error handling settings request:', error);
      this.requestSocket.send(JSON.stringify({ error: error.message }));
    }
  }

  send(command, args) {
    return new Promise((resolve, reject) => {
      const message = JSON.stringify({ command, args });
      this.requestSocket.send(message);

      this.requestSocket.once('message', (reply) => {
        try {
          const response = JSON.parse(reply.toString());
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

module.exports = new ZMQService();
