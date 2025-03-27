import json
import sys
import socket
import os
import asyncio
import struct

print(f"Current user: {os.getuid()}")
print(f"Tmp directory permissions: {os.stat('/tmp').st_mode}")

def print_host_info():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"Hostname: {hostname}")
    print(f"Local IP: {local_ip}")

class MessageQueue:
    def __init__(self, socket_path: str = '/tmp/electron_python.sock'):
        self.socket_path = socket_path
        self.server = None
        self.current_client = None
        self.current_writer = None
        self.is_connected = False
        self.connection_event = asyncio.Event()
        self.loop = asyncio.get_event_loop()
        print(f"Initialized MessageQueue with socket path: {socket_path}")

    async def start(self):
        try:
            self.server = await asyncio.start_unix_server(
                self.handle_client,
                self.socket_path
            )
            print(f"Server listening on {self.socket_path}")
            # Wait for connection before sending ready message
            await self.connection_event.wait()
            await self.send({"type": "ready"})
        except Exception as e:
            print(f"Error starting server: {e}")
            raise

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        if self.current_client is not None:
            print("Rejecting new connection - already connected")
            writer.close()
            await writer.wait_closed()
            return

        self.current_client = writer
        self.current_writer = writer
        self.is_connected = True
        self.connection_event.set()
        print(f"New client connected: {id(writer)}")

        try:
            while True:
                data = await reader.readline()
                if not data:
                    break
                try:
                    message = json.loads(data.decode())
                    print(f"Received message: {message}")
                    # Handle message here
                except json.JSONDecodeError:
                    print(f"Invalid JSON received: {data}")
        except Exception as e:
            print(f"Error handling client: {e}")
        finally:
            self.current_client = None
            self.current_writer = None
            self.is_connected = False
            writer.close()
            await writer.wait_closed()
            print("Client disconnected")

    async def send(self, message: dict):
        if not self.current_writer:
            print("No active connection to send message")
            return

        try:
            data = json.dumps(message) + "\n"
            self.current_writer.write(data.encode())
            await self.current_writer.drain()
        except Exception as e:
            print(f"Error sending message: {e}")
            self.current_client = None
            self.current_writer = None
            self.is_connected = False

    async def run(self):
        print("Starting message loop...")
        try:
            # Start the server first
            server_task = asyncio.create_task(self.start())
            
            # Wait a bit for the server to start
            await asyncio.sleep(1)
            
            # Wait for the server task
            await server_task
            
        except Exception as e:
            print(f"Error in message loop: {e}")
        finally:
            self.cleanup()

    def cleanup(self):
        try:
            if os.path.exists(self.socket_path):
                os.unlink(self.socket_path)
        except Exception as e:
            print(f"Error during cleanup: {e}")
        
