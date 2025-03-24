#!/usr/bin/env python3
import sys
import os
import json
import time
import traceback

# Add current directory and parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.dirname(current_dir))

try:
    from interface import Interface, GUInterface
except ImportError:
    print(json.dumps({
        "type": "error",
        "data": f"Failed to import modules. Current path: {sys.path}"
    }))
    sys.exit(1)

class ElectronBridge:
    def __init__(self):
        self.interface = None
        self.gui_interface = None
        
    def send_to_electron(self, message_type, data):
        """Send a message to the Electron process via stdout."""
        message = {
            "type": message_type,
            "data": data
        }
        print(json.dumps(message), flush=True)
        
    def handle_input(self, command_json):
        """Handle input from Electron process."""
        try:
            command = json.loads(command_json)
            action = command.get("action")
            
            if action == "init":
                self.init_solver(command.get("solverPath", ""))
            elif action == "run_command":
                self.execute_command(
                    command.get("solverPath", ""),
                    command.get("command", ""),
                    command.get("args", {})
                )
            elif action == "get_commands":
                self.get_commands()
            elif action == "input":
                self.handle_user_input(command.get("input", ""))
            else:
                self.send_to_electron("error", f"Unknown action: {action}")
        except json.JSONDecodeError:
            self.send_to_electron("error", f"Invalid JSON: {command_json}")
        except Exception as e:
            self.send_to_electron("error", f"Error: {str(e)}\n{traceback.format_exc()}")
    
    def init_solver(self, solver_path):
        """Initialize the solver with the given path."""
        try:
            self.interface = Interface(solver_path)
            self.gui_interface = GUInterface(self.interface)
            
            # Set up callbacks to forward events to Electron
            def on_step_update(step_data):
                self.send_to_electron("step_update", step_data)
                
            def on_output(output_data):
                self.send_to_electron("output", output_data)
                
            def on_error(error_data):
                self.send_to_electron("error", error_data)
                
            def on_request_input(prompt):
                self.send_to_electron("request_input", {"prompt": prompt})
                
            # Attach callbacks
            self.gui_interface.set_callbacks(
                step_update=on_step_update,
                output=on_output,
                error=on_error,
                request_input=on_request_input
            )
            
            self.send_to_electron("init_complete", {
                "success": True,
                "message": "Solver initialized successfully."
            })
        except Exception as e:
            self.send_to_electron("init_complete", {
                "success": False,
                "message": f"Failed to initialize solver: {str(e)}\n{traceback.format_exc()}"
            })
    
    def execute_command(self, solver_path, command, args):
        """Execute a command with the given solver path and arguments."""
        try:
            if not self.interface or not self.gui_interface:
                self.init_solver(solver_path)
                
            # Convert args to the format expected by the interface
            formatted_args = self.format_args(args)
            
            # Execute the command
            self.gui_interface.run_command(command, formatted_args)
            
            self.send_to_electron("command_complete", {
                "success": True,
                "command": command,
                "message": "Command executed successfully."
            })
        except Exception as e:
            self.send_to_electron("command_complete", {
                "success": False,
                "command": command,
                "message": f"Failed to execute command: {str(e)}\n{traceback.format_exc()}"
            })
    
    def get_commands(self):
        """Get the list of available commands."""
        try:
            commands = self.gui_interface.get_commands() if self.gui_interface else []
            self.send_to_electron("commands", commands)
        except Exception as e:
            self.send_to_electron("error", f"Failed to get commands: {str(e)}\n{traceback.format_exc()}")
    
    def handle_user_input(self, input_text):
        """Handle user input responses."""
        try:
            if self.gui_interface:
                self.gui_interface.provide_input(input_text)
                self.send_to_electron("input_received", {
                    "success": True,
                    "message": "Input processed successfully."
                })
            else:
                self.send_to_electron("input_received", {
                    "success": False,
                    "message": "No active interface to receive input."
                })
        except Exception as e:
            self.send_to_electron("input_received", {
                "success": False,
                "message": f"Failed to process input: {str(e)}\n{traceback.format_exc()}"
            })
    
    def format_args(self, args):
        """Format arguments to the expected format."""
        # This will need to be customized based on how your interface expects arguments
        return args
    
    def run(self):
        """Run the bridge, processing input from stdin."""
        self.send_to_electron("ready", {"message": "Python bridge is ready"})
        
        while True:
            try:
                # Read from stdin
                command_json = sys.stdin.readline().strip()
                if not command_json:
                    time.sleep(0.1)  # Avoid CPU spin
                    continue
                    
                self.handle_input(command_json)
            except KeyboardInterrupt:
                self.send_to_electron("shutdown", {"message": "Bridge shutting down"})
                break
            except Exception as e:
                self.send_to_electron("error", f"Bridge error: {str(e)}\n{traceback.format_exc()}")

if __name__ == "__main__":
    # Print startup message
    sys.stderr.write(f"Python bridge starting. Python version: {sys.version}\n")
    sys.stderr.write(f"Current directory: {os.getcwd()}\n")
    sys.stderr.write(f"Python path: {sys.path}\n")
    
    # Check for environment variables
    mappings_path = os.environ.get('PIOSPEED_MAPPINGS_PATH')
    sys.stderr.write(f"Mappings path from env: {mappings_path}\n")
    
    bridge = ElectronBridge()
    bridge.run() 