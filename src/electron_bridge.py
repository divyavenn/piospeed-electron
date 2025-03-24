from __future__ import annotations
import sys
import json
import os

# Add the current directory to the Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from SolverConnection.solver import Solver
from interface import Interface, GUInterface
from program import Program
from global_var import solverPath
import traceback

class ElectronInterface(Interface):
    """Interface implementation that communicates with the Electron frontend"""
    
    def __init__(self) -> None:
        super().__init__()
        self.current_step = ""
        
    def getText(self, metadata) -> str:
        # In this implementation, the Electron app will send the text input
        # This will be called by the Python code when needed
        print(json.dumps({
            "type": "request_input",
            "input_type": "text",
            "prompt": metadata.prompt if hasattr(metadata, 'prompt') else "Enter text:"
        }), flush=True)
        
        # Read the response from stdin (sent by Electron)
        return input()

    def getFilePath(self, metadata) -> str:
        # Request file selection from Electron
        prompt = metadata.prompt if hasattr(metadata, 'prompt') else "Select a file:"
        default_location = metadata.default_location if hasattr(metadata, 'default_location') else ""
        
        print(json.dumps({
            "type": "request_input",
            "input_type": "file",
            "prompt": prompt,
            "default_location": default_location
        }), flush=True)
        
        # Read the response from stdin (sent by Electron)
        return input()
    
    def getFolder(self, metadata) -> str:
        # Request directory selection from Electron
        prompt = metadata.prompt if hasattr(metadata, 'prompt') else "Select a folder:"
        default_location = metadata.default_location if hasattr(metadata, 'default_location') else ""
        
        print(json.dumps({
            "type": "request_input",
            "input_type": "directory",
            "prompt": prompt,
            "default_location": default_location
        }), flush=True)
        
        # Read the response from stdin (sent by Electron)
        return input()
    
    def getCommand(self, metadata = None) -> PluginCommands:
        # Request command selection from Electron
        print(json.dumps({
            "type": "request_input",
            "input_type": "command",
            "commands": list(self.commandMap.keys())
        }), flush=True)
        
        # Read the selected command from stdin
        selected_command = input()
        
        if selected_command not in self.commandMap:
            self.output("Invalid command")
            return self.getCommand(metadata)
            
        return self.commandMap[selected_command]
    
    def output(self, message) -> None:
        # Send output message to Electron
        print(json.dumps({
            "type": "output",
            "message": message
        }), flush=True)
    
    def notify(self, message) -> None:
        # Send notification/step update to Electron
        self.current_step = message
        print(json.dumps({
            "type": "step_update",
            "step": message
        }), flush=True)


def main():
    # Parse command line arguments
    command = sys.argv[1] if len(sys.argv) > 1 else None
    
    try:
        # Create our Electron-compatible interface
        interface = ElectronInterface()
        
        if command == "init":
            # Initialize the solver connection
            solver_path = sys.argv[2] if len(sys.argv) > 2 else solverPath
            
            if not solver_path:
                print(json.dumps({
                    "type": "error",
                    "message": "No solver path provided"
                }), flush=True)
                return
                
            try:
                connection = Solver(solver_path)
                print(json.dumps({
                    "type": "success",
                    "message": "Solver connected successfully!"
                }), flush=True)
                
                # Return success but don't start the program yet
                return
            except Exception as e:
                print(json.dumps({
                    "type": "error",
                    "message": f"Failed to connect to solver: {str(e)}"
                }), flush=True)
                return
                
        elif command == "run_command":
            # Run a specific command with arguments
            solver_path = sys.argv[2] if len(sys.argv) > 2 else solverPath
            command_name = sys.argv[3] if len(sys.argv) > 3 else None
            args_json = sys.argv[4] if len(sys.argv) > 4 else "[]"
            
            if not solver_path or not command_name:
                print(json.dumps({
                    "type": "error",
                    "message": "Missing solver path or command name"
                }), flush=True)
                return
                
            try:
                # Parse arguments from JSON
                args = json.loads(args_json)
                
                # Connect to solver
                connection = Solver(solver_path)
                
                # Create program instance
                program = Program(connection, interface)
                
                # Find the command in the command map
                if command_name not in interface.commandMap:
                    print(json.dumps({
                        "type": "error",
                        "message": f"Unknown command: {command_name}"
                    }), flush=True)
                    return
                    
                command_enum = interface.commandMap[command_name]
                
                # Execute the command with the given arguments
                result = program.executeCommand(command_enum, args)
                
                print(json.dumps({
                    "type": "result",
                    "result": result if result is not None else "Command executed successfully"
                }), flush=True)
                
            except Exception as e:
                traceback_str = traceback.format_exc()
                print(json.dumps({
                    "type": "error",
                    "message": f"Error executing command: {str(e)}",
                    "traceback": traceback_str
                }), flush=True)
                return
                
        elif command == "get_commands":
            # Return the list of available commands
            commands = {}
            for key, cmd in interface.commandMap.items():
                # Only include string commands (not enum values)
                if isinstance(key, str):
                    # Get command description if available
                    description = getattr(cmd.value, "description", "")
                    commands[key] = description
                    
            print(json.dumps({
                "type": "commands",
                "commands": commands
            }), flush=True)
            
        else:
            # Start the interactive program if no specific command
            solver_path = sys.argv[2] if len(sys.argv) > 2 else solverPath
            
            if not solver_path:
                print(json.dumps({
                    "type": "error",
                    "message": "No solver path provided"
                }), flush=True)
                return
                
            try:
                connection = Solver(solver_path)
                interface.output("Solver connected successfully! Welcome to PioSolver")
                
                program = Program(connection, interface)
                program.start()
            except Exception as e:
                print(json.dumps({
                    "type": "error",
                    "message": f"Error starting program: {str(e)}"
                }), flush=True)
                
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "message": f"Unexpected error: {str(e)}"
        }), flush=True)


if __name__ == "__main__":
    main() 