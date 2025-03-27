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
    def __init__(self):
        self.socket_path = '/tmp/electron_python.sock'
        self.current_client = None
        self.current_writer = None
        print("Unix domain socket server started, waiting for messages...")

    async def receive(self):
        try:
            # Create Unix domain socket server
            server = await asyncio.start_unix_server(
                self.handle_client,
                self.socket_path
            )
            print(f"Server listening on {self.socket_path}")
            await server.serve_forever()
        except Exception as e:
            print(f"Error in receive: {e}")
            return None

    async def handle_client(self, reader, writer):
        if self.current_client:
            print("Rejecting new connection - already have a client")
            writer.close()
            await writer.wait_closed()
            return

        self.current_client = id(writer)
        self.current_writer = writer
        print(f"New client connected: {self.current_client}")
        
        try:
            while True:
                try:
                    # Read message length (4 bytes)
                    length_bytes = await reader.readexactly(4)
                    message_length = struct.unpack('!I', length_bytes)[0]
                    
                    # Read the actual message
                    message_bytes = await reader.readexactly(message_length)
                    message = json.loads(message_bytes.decode())
                    
                    print(f"Received message from client {self.current_client}: {message}")
                    
                    # Process the message
                    if message.get('type') == 'ready':
                        print(f"Client {self.current_client} is ready")
                    
                    # Send acknowledgment
                    response = json.dumps({"status": "ok"})
                    response_bytes = response.encode()
                    writer.write(struct.pack('!I', len(response_bytes)) + response_bytes)
                    await writer.drain()
                    
                except asyncio.IncompleteReadError:
                    print(f"Client {self.current_client} disconnected")
                    break
                except Exception as e:
                    print(f"Error handling message from client {self.current_client}: {e}")
                    break
                
        except Exception as e:
            print(f"Error handling client {self.current_client}: {e}")
        finally:
            try:
                writer.close()
                await writer.wait_closed()
                print(f"Client {self.current_client} connection closed")
                if self.current_client == id(writer):
                    self.current_client = None
                    self.current_writer = None
            except Exception as e:
                print(f"Error closing client {self.current_client} connection: {e}")

    async def send(self, status, message, expect_response=False):
        if not self.current_writer:
            print("No active connection to send message")
            return None

        try:
            # Prepare message
            message_data = json.dumps({'type': status, 'message': message})
            message_bytes = message_data.encode()
            
            # Send message length and data
            self.current_writer.write(struct.pack('!I', len(message_bytes)) + message_bytes)
            await self.current_writer.drain()
            
            # Only read response if expected
            if expect_response:
                response_length_bytes = await self.current_reader.readexactly(4)
                response_length = struct.unpack('!I', response_length_bytes)[0]
                response_bytes = await self.current_reader.readexactly(response_length)
                response = json.loads(response_bytes.decode())
            else:
                response = None
            
            return response
        except Exception as e:
            print(f"Error sending message: {e}")
            return None

    async def run(self):
        print("Starting message loop...")
        try:
            # Start the server first
            server_task = asyncio.create_task(self.receive())
            
            # Wait a bit for the server to start
            await asyncio.sleep(1)
            
            # Send ready message to indicate initialization is complete
            await self.send("ready", None)
            
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
        
