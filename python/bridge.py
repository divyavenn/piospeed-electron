import json
import traceback
import os
import asyncio
from SolverConnection.solver import Solver
from Message import Message
from inputs import FolderOf, WeightsFile, BoardFile, Extension
# Import Program when needed to avoid circular imports


class MessageQueue:
    def __init__(self, socket_path: str = '/tmp/electron_python.sock'):
        self.socket_path = socket_path
        self.server = None
        self.current_client = None
        self.current_writer = None
        self.is_connected = False
        self.connection_event = asyncio.Event()
        self.loop = asyncio.get_event_loop()
        self.program = None
        # For handling input responses
        self.last_input_response = None
        self.input_response_event = asyncio.Event()
        print("Python connected to socket " + socket_path)

    async def start(self):
        """Start the server and wait for connections"""
        try:
            # Remove the socket file if it already exists
            if os.path.exists(self.socket_path):
                os.unlink(self.socket_path)
                
            # Start the Unix socket server
            self.server = await asyncio.start_unix_server(
                self.handle_connection,
                self.socket_path
            )
            
            # Set socket permissions to allow Electron to connect
            os.chmod(self.socket_path, 0o777)
            
            print(f"Server started on {self.socket_path}")
            
            # Wait for a connection
            await self.connection_event.wait()
            
            # Send a ready message
            await self.send(Message("python ready", None))
            
        except Exception as e:
            print(f"Error starting server: {e}")
            traceback.print_exc()

    async def handle_connection(self, reader, writer):
        """Handle a new connection"""
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
    
    async def notify(self, msg):
        """Send a notification message to the Electron frontend"""
        await self.send(Message("notification", msg))
    
    async def message_listener(self):
        """Continuously listen for messages from Electron"""
        
        # Wait for connection to be established
        await self.connection_event.wait()
        
        while True:
            try:
                # Read a line from the socket
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
                        # No need to create ElectronInterface anymore

                    # get solver path
                    elif message.type == 'solverPath':
                        try: 
                            connection = Solver(message.data)
                            await self.send(Message('solver ready', connection))
                            # Create Program with notify function
                            from program import Program
                            self.program = Program(
                                connection=connection,
                                notify_func=self.notify_sync,
                                get_input_func=None
                            )
                            # Add send_message method to program
                            self.program.send_message = self.send
                        except Exception as e:
                            await self.send(Message('error', f'Failed to connect to solver: {str(e)}'))
                    
                    # Handle command execution
                    elif message.type == 'command':
                        try:
                            command_name = message.data.get('type')
                            args = message.data.get('args', [])
                            
                            print(f"Received command: {command_name} with args: {args}")
                            
                            # Execute the command
                            if self.program:
                                # Get the command from the command map
                                from menu import PluginCommands
                                
                                # Map frontend command names to PluginCommands enum
                                command_map = {
                                    'NODELOCK_SOLVE': PluginCommands.NODELOCK_SOLVE,
                                    'RUN_MINI': PluginCommands.RUN_AUTO,
                                    'RUN_FULL_SAVE': PluginCommands.RUN_FULL_SAVE,
                                    'NODELOCK': PluginCommands.NODELOCK,
                                    'GET_RESULTS': PluginCommands.GET_RESULTS,
                                    'SAVE_NO_RIVERS': PluginCommands.SAVE_NO_RIVERS,
                                    'SAVE_NO_TURNS': PluginCommands.SAVE_NO_TURNS
                                }
                                
                                command = command_map.get(command_name)
                                print(f"Mapped command: {command_name} -> {command}")
                                
                                if command:
                                    # Set the command and args
                                    self.program.set_command(command, args)
                                    # Run the command asynchronously
                                    asyncio.create_task(self.program.commandRun())
                                    await self.send(Message('command_started', command_name))
                                else:
                                    await self.send(Message('error', f'Unknown command: {command_name}'))
                            else:
                                await self.send(Message('error', 'Program not initialized. Please set solver path first.'))
                        except Exception as e:
                            print(f"Error executing command: {str(e)}")
                            traceback.print_exc()  # Print the full traceback for debugging
                            await self.send(Message('error', f'Error executing command: {str(e)}'))
                    
                    # Handle input requests and responses
                    elif message.type == 'input_response':
                        # Store the response for retrieval
                        self.last_input_response = message.data
                        # Notify any waiting coroutines
                        self.input_response_event.set()
                    
                    # Handle input validation requests
                    elif message.type == 'validate_input':
                        try:
                            input_type = message.data.get('input_type')  # e.g., 'file', 'folder', 'cfr', 'json', etc.
                            input_value = message.data.get('value')
                            
                            print(f"Validating input of type {input_type}: {input_value}")

                            
                            # Map input type to the appropriate Input class
                            input_class_map = {
                                'cfr_folder': FolderOf(Extension.cfr).parseInput,
                                'weights_file': WeightsFile.parseInput,
                                'board_file': BoardFile.parseInput,
                            }
                            
                            # Get the appropriate validation method
                            method = input_class_map.get(input_type)
                            
                            # Validate the input
                            try:
                                # Try to parse the input (this will validate it)
                                method(input_value)
                                    
                                # Input is valid
                                await self.send(Message('input_validation', {
                                    'is_valid': True,
                                    'input_type': input_type
                                }))
                            except Exception as e:
                                # Input is invalid
                                await self.send(Message('input_validation', {
                                    'is_valid': False,
                                    'error': str(e),
                                    'input_type': input_type
                                }))
                            else:
                                await self.send(Message('error', f'Unknown input type: {input_type}'))
                        except Exception as e:
                            print(f"Error validating input: {str(e)}")
                            await self.send(Message('error', f'Error validating input: {str(e)}'))
                    
                    else:
                        print(f"Unhandled message type: {message.type}")
                
                except json.JSONDecodeError as e:
                    print(f"Error decoding message: {e}")
                    print(f"Raw data: {data}")
                
            except Exception as e:
                print(f"Error in message listener: {e}")
                traceback.print_exc()
                await asyncio.sleep(1)  # Prevent tight loop in case of errors

    async def run(self):
        try:
            # Start the server first
            await self.start()
            
            # Then start listening for messages
            await self.message_listener()
        except Exception as e:
            print(f"Error in run: {e}")
            traceback.print_exc()
    
    def notify_sync(self, message):
        """Synchronous version of notify for use as a callback"""
        asyncio.create_task(self.notify(message))
    
    async def cleanup(self):
        """Clean up resources"""
        try:
            if self.server:
                self.server.close()
                await self.server.wait_closed()
                
            if self.current_writer:
                self.current_writer.close()
                await self.current_writer.wait_closed()
                
            if os.path.exists(self.socket_path):
                os.unlink(self.socket_path)
        except Exception as e:
            print("Error during cleanup: " + str(e))

        """Get the appropriate validator for the input type and command"""
        from inputs import FileInput, FolderOf, Extension
        
        # Map of input types to validator classes
        validators = {
            'cfrFolder': {
                'solve': FileInput(Extension.cfr),
                'getResults': FileInput(Extension.cfr),
                'resave': FolderOf(Extension.cfr),
            },
            'nodeBook': {
                'resave': FileInput(Extension.json),
            },
            'weights': {
                'resave': FileInput(Extension.json),
            },
            # Add more as needed
        }
        
        # Return the appropriate validator or None if not found
        return validators.get(input_type, {}).get(command)

    async def wait_for_input_response(self):
        """Wait for an input response from Electron"""
        # Clear any previous response
        self.last_input_response = None
        self.input_response_event.clear()
        
        # Wait for a new response
        await self.input_response_event.wait()
        
        # Return the response
        response = self.last_input_response
        self.last_input_response = None
        return response