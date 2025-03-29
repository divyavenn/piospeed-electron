import json
import sys
import socket
import os
import asyncio
import struct


def print_host_info():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)


class Message:
    def __init__(self, type: str, data: any):
        self.type = type
        self.data = data

class MessageQueue:
    def __init__(self, socket_path: str = '/tmp/electron_python.sock'):
        self.socket_path = socket_path
        self.server = None
        self.current_client = None
        self.current_writer = None
        self.is_connected = False
        self.connection_event = asyncio.Event()
        self.loop = asyncio.get_event_loop()
        print("........connecting to socket : " + socket_path)


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
            await self.send(Message("ready", None))
            print("........Pinged client.")
        except Exception as e:
            print("Error starting server: " + str(e))
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
        print("New client connected: " + str(id(writer)))

    async def receive(self):
        if not self.current_writer:
            print("No active connection to receive message")
            return
        data = await self.current_writer.readline()
        return json.loads(data.decode())

    async def send(self, message: Message):
        if not self.current_writer:
            print("No active connection to send message")
            return

        try:
            # Format message as expected by node-ipc
            json_message = {
                "type": message.type,
                "data": message.data
            }
            
            # Debug the message being sent
            print("Sending message: " + str(json_message))
            
            # Ensure proper message framing with a single newline
            # This is critical for Node IPC to parse the message correctly
            data = json.dumps(json_message) + "\n"
            
            # Send as UTF-8 encoded bytes
            self.current_writer.write(data.encode('utf-8'))
            await self.current_writer.drain()
            
            # Add a small delay to ensure message is fully sent
            await asyncio.sleep(0.1)
            
            print("Message sent successfully")
        except Exception as e:
            print("Error sending message: " + str(e))
            self.current_client = None
            self.current_writer = None
            self.is_connected = False

    async def run(self):
        try:
            # Start the server first
            await asyncio.create_task(self.start())
            
        except Exception as e:
            print("Error in message loop: " + str(e))
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
            print("Error during cleanup: " + str(e))