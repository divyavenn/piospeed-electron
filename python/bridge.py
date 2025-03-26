import zmq
import json
import sys
import socket

def print_host_info():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"Hostname: {hostname}")
    print(f"Local IP: {local_ip}")

class MessageQueue:
    def __init__(self, python="tcp://127.0.0.1:5559", react="tcp://127.0.0.1:5558"):
        print_host_info()
        self.context = zmq.Context()
        self.me = self.context.socket(zmq.REP)
        self.me.setsockopt(zmq.LINGER, 0)  # Don't wait on close
        self.me.setsockopt(zmq.RCVTIMEO, 1000)  # Receive timeout
        self.me.bind(python)
        
        # Publisher socket for notifications
        self.him = self.context.socket(zmq.PUB)
        self.him.setsockopt(zmq.LINGER, 0)
        self.him.bind(react)
        
        print("ZeroMQ server started, waiting for messages...")

    async def recieve(self, message):
        # Read from stdin for direct messages from Electron
        while True:
            line = sys.stdin.readline().strip()
            if line.startswith('SET_SOLVER_PATH:'):
                solver_path = line.replace('SET_SOLVER_PATH:', '')
                return {'type': 'solver_path', 'path': solver_path}
            elif line:
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
        return self.me.recv_json()

    async def send(self, status, message):
        message = json.dumps({'status': status, 'message': message})
        self.him.send_string(message)
        
    async def run(self):
        print("Starting message loop...")
        while True:
            try:
                message = await self.recieve(None)  # Wait for messages
                print(f"Received message: {message}")
                # Process message here
                await self.send("success", "Message received")
            except Exception as e:
                print(f"Error in message loop: {e}")
        
    def __del__(self):
        self.me.close()
        self.him.close()
        self.context.term()
        