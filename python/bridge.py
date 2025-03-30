import json
import traceback
import os
import asyncio
from SolverConnection.testSolver import Solver
from Message import Message
from testProgram import Program
from menu import PluginCommands
from inputs import InputType, CFRFolder, WeightsFile, BoardFile

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
        self.command_map = {cmd.value.name: cmd for cmd in PluginCommands}
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
                            await self.send(Message('solver ready', None))
                            # Create Program with notify function
                            self.program = Program(
                                connection=connection,
                                notify_func=self.notify_sync,
                            )
                            # Add send_message method to program
                            self.program.send_message = self.send
                        except Exception as e:
                            await self.send(Message('error', f'Failed to connect to solver: {str(e)}'))
                            
                    elif message.type == 'resultsPath':
                        if self.program:
                            self.program.set_results_dir(message.data)
                        else:
                            await self.send(Message('error', 'Program not initialized. Please set solver path first.'))
                            
                    elif message.type == 'accuracy':
                        if self.program:
                            try:
                                accuracy = float(message.data)
                                self.program.update_accuracy(accuracy)
                            except ValueError:
                                await self.send(Message('error', 'Invalid accuracy value'))
                        else:
                            await self.send(Message('error', 'Program not initialized. Please set solver path first.'))
                    
                    # Handle command execution
                    elif message.type == 'command':
                        try:
                            command_name = message.data.get('type')
                            args = message.data.get('args', {})
                            
                            print(f"Received command: {command_name} with args: {args}")
                            
                            # Execute the command
                            if self.program:
                                await self.handle_command(command_name, args)
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
                                'cfr_folder': CFRFolder().parseInput,
                                'weights_file': WeightsFile().parseInput,
                                'board_file': BoardFile().parseInput,
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

    async def handle_command(self, command_str: str, args: dict) -> None:
        """Handle a command from the frontend"""
        try:
            # Convert command string to enum using command map
            print(f"Received command: {command_str} with args: {args}")
            
            command = self.command_map[command_str]

            # Get list of required input types from command definition
            required_inputs = [arg.type for arg in command.value.args]
            
            # Prepare arguments in correct order
            ordered_args = []
            
            # First argument is always [folder_path, cfr_files] if cfr_folder is required
            if InputType.cfr_folder in required_inputs:
                folder_path = args.get('cfr_folder')
                if not folder_path:
                    raise ValueError("Missing cfr_folder argument")
                
                # Get all .cfr files in the folder
                cfr_files = []
                for root, _, files in os.walk(folder_path):
                    for file in files:
                        if file.endswith('.cfr'):
                            cfr_files.append(os.path.join(root, file))
                
                if not cfr_files:
                    raise ValueError(f"No .cfr files found in {folder_path}")
                
                ordered_args.append([folder_path, cfr_files])
            
            # Second argument is weights file if required
            if InputType.weights_file in required_inputs:
                weights_path = args.get('weights_file')
                if not weights_path:
                    raise ValueError("Missing weights_file argument")
                # Create a map of category names -> weights (currently just the path)
                weights_map = {'weights': weights_path}
                ordered_args.append(weights_map)
            
            # Third argument is board file and type if required
            if InputType.board_file in required_inputs:
                board_path = args.get('board_file')
                if not board_path:
                    raise ValueError("Missing board_file argument")
                # Create the [nodeID/map, board_type] array
                # For now, using board_path as nodeID and 'default' as board_type
                board_info = [board_path, 'default', board_path]  # [nodeID, board_type, original_path]
                ordered_args.append(board_info)
            
            print(f"Executing command {command} with ordered args: {ordered_args}")
            # Run the command with ordered arguments
            await self.program.commandRun(command, ordered_args)
        
        except KeyError:
            await self.send(Message('error', f'Unknown command: {command_str}'))
        except Exception as e:
            await self.send(Message('error', f'Error executing command: {str(e)}'))
    
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
