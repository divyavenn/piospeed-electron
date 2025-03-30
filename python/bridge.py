import json
import socket
import os
import asyncio
from SolverConnection.solver import Solver


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
        print("Python connected to socket " + socket_path)



    # Python starts and waits for Electron to connect
    # When Electron connects, Python sends a "ready" message using self.current_writer
    # Electron can send messages to Python, which are read using self.current_client.readline()
    # Python can send responses back to Electron using self.current_writer.write()
    async def start(self):
        try:
            self.server = await asyncio.start_unix_server(
                self.prevent_multiple_connections,
                self.socket_path
            )
            # Wait for connection before sending ready message
            await self.connection_event.wait()
            # send message to client that the server is ready
            await self.send(Message("python ready", None))
        except Exception as e:
            print("Error starting server: " + str(e))
            raise

    async def prevent_multiple_connections(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        if self.current_client is not None:
            print("Rejecting new connection - already connected")
            writer.close()
            await writer.wait_closed()
            return

        self.current_client = reader
        self.current_writer = writer
        self.is_connected = True
        self.connection_event.set()
        print("New client connected: " + str(id(writer)))

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
            print("Python sending message: " + str(json_message))
            
            # Ensure proper message framing with a single newline
            # This is critical for Node IPC to parse the message correctly
            data = json.dumps(json_message) + "\n"
            
            # Send as UTF-8 encoded bytes
            self.current_writer.write(data.encode('utf-8'))
            await self.current_writer.drain()
        except Exception as e:
            print("Error sending message: " + str(e))
            self.current_client = None
            self.current_writer = None
            self.is_connected = False
    
    
    
    async def message_listener(self):
        """Continuously listen for messages from Electron"""
        
        # Wait for connection to be established
        await self.connection_event.wait()
        print("Python connected to Electron")
        
        while self.is_connected:
            try:
            
                # Wait for a message
                data = await self.current_client.readline()
                
                if not data:
                    print("No data received, connection may be closed")
                    await asyncio.sleep(0.5)
                    continue
                
                # Parse the message
                try:
                    # The message might be sent with 'emit' from node-ipc which adds a prefix
                    # Try to find and parse the JSON part of the message
                    message_str = data.decode()
                    print("Python recieved from Electron: " + message_str)
                    message = Message(json.loads(message_str)['type'], json.loads(message_str)['data'])
                
                    # handshake protocol
                    if message.type == 'electron ready':
                        await self.send(Message('hi!', None))
                    # get solver path
                    elif message.type == 'solverPath':
                        try: 
                            connection = Solver(message.data)
                            await self.send(Message('solver ready', connection))
                        except Exception as e:
                            await self.send(Message('error', 'Failed to connect to solver'))
                            
                    
                except json.JSONDecodeError as e:
                    print(f"Error decoding message: {e}")
                    print(f"Raw data: {data}")
                except Exception as e:
                    print(f"Error processing message: {e}")
                    print(f"Raw data: {data}")
                
            except Exception as e:
                print(f"Error in message listener: {e}")
                print(f"Error type: {type(e).__name__}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(1)  # Prevent tight loop in case of errors

    async def run(self):
        try:
            # Start the server first
            server_task = asyncio.create_task(self.start())
            
            # Start a message listener loop
            listener_task = asyncio.create_task(self.message_listener())
            
            # Wait for both tasks
            await asyncio.gather(server_task, listener_task)
            
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