import json
import sys
import socket
import os
import asyncio
import struct


def print_host_info():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

class MessageQueue:
    def __init__(self, socket_path: str = '/tmp/electron_python.sock'):
        self.socket_path = socket_path
        self.server = None
        self.current_client = None
        self.current_writer = None
        self.is_connected = False
        self.connection_event = asyncio.Event()
        self.loop = asyncio.get_event_loop()
        print(f"........connecting to socket : {socket_path}")


    async def start(self):
        try:
            self.server = await asyncio.start_unix_server(
                self.prevent_multiple_connections,
                self.socket_path
            )
            print("........Yay! Ready to recieve messages.")
            # Wait for connection before sending ready message
            await self.connection_event.wait()
            # send message to client that the server is ready
            await self.send({"message": "ready"})
        except Exception as e:
            print(f"Error starting server: {e}")
            raise

    async def prevent_multiple_connections(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
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

    async def receive(self):
        if not self.current_writer:
            print("No active connection to receive message")
            return
        data = await self.current_writer.readline()
        return json.loads(data.decode())

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
        try:
            # Start the server first
            await asyncio.create_task(self.start())
            
        except Exception as e:
            print(f"Error in message loop: {e}")
        finally:
            await self.cleanup()

    async def cleanup(self):
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            print("Server disconnected")

        try:
            if os.path.exists(self.socket_path):
                os.unlink(self.socket_path)
        except Exception as e:
            print(f"Error during cleanup: {e}")