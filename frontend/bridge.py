import socket
import json
import sys
import os
print(f"Current user: {os.getuid()}")
print(f"Tmp directory permissions: {os.stat('/tmp').st_mode}")

def print_host_info():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"Hostname: {hostname}")
    print(f"Local IP: {local_ip}")

class MessageQueue:
    def __init__(self):
        self.socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.socket_path = "/tmp/electron_python.sock"
        
        # Remove existing socket file if it exists
        if os.path.exists(self.socket_path):
            os.unlink(self.socket_path)
            
        self.socket.bind(self.socket_path)
        self.socket.listen(1)
        self.conn = None
        self.addr = None
        
        print("Unix domain socket server started, waiting for messages...")

    async def receive(self):
        try:
            if not self.conn:
                self.conn, self.addr = self.socket.accept()
                print("Client connected")
                
            # Read from the socket
            data = self.conn.recv(4096).decode('utf-8').strip()
            if not data:
                return None
                
            message = json.loads(data)
            print(f"Received message: {message}")
            return message
        except Exception as e:
            print(f"Error receiving message: {e}")
            return None

    async def send(self, status, message):
        try:
            if not self.conn:
                return
                
            data = json.dumps({'status': status, 'message': message})
            self.conn.sendall(data.encode('utf-8') + b'\n')
        except Exception as e:
            print(f"Error sending message: {e}")
        
    async def run(self):
        print("Starting message loop...")
        while True:
            try:
                await self.receive()  # Wait for messages
                # Process message here
                await self.send("success", "Message received")
            except Exception as e:
                print(f"Error in message loop: {e}")

    def __del__(self):
        try:
            if self.conn:
                self.conn.close()
            if hasattr(self, 'socket'):
                self.socket.close()
            if os.path.exists(self.socket_path):
                os.unlink(self.socket_path)
        except Exception as e:
            print(f"Error during cleanup: {e}") 