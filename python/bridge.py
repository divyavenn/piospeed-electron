import zmq
import json
import sys
import socket
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
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PAIR)
        self.socket.bind("ipc:///tmp/electron_test")
        
        print("ZeroMQ server started, waiting for messages...")

    async def receive(self):
        try:
            # Read from the ZMQ socket
            message = await self.socket.recv_json()
            print(f"Received message: {message}")
            return message
        except zmq.error.Again:
            # Handle timeout
            return None

    async def send(self, status, message):
        message = json.dumps({'status': status, 'message': message})
        self.him.send_string(message)
        
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
            if hasattr(self, 'socket'):
                self.socket.close()
            if hasattr(self, 'context'):
                self.context.term()
        except Exception as e:
            print(f"Error during cleanup: {e}")
        
