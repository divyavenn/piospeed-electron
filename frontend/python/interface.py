from __future__ import annotations
from menu import Command, PluginCommands
from inputs import InputType, Input, InputMetadata
from bridge import MessageQueue
from easygui import enterbox, diropenbox, fileopenbox, choicebox, msgbox
from errorMessages import Errors
import os
import time
import json
import asyncio

printConsole = False

# Handles the interface. Graphical / web interfaces can be created by extending this class
def clearConsole():
    os.system('cls' if os.name=='nt' else 'clear')
    
class Interface:
    def __init__(self) -> None:
        self.commandMap: dict[str, Command] = {}
        for enumMember in PluginCommands:
            self.commandMap[enumMember.value.__str__()] = enumMember

        self.inputGetterMap = {
            InputType.file: self.getFilePath,
            InputType.text: self.getText,
            InputType.number: self.getText,
            InputType.directory: self.getFolder
        }

    # gets a text input from user
    async def getText(self, metadata) -> str:
        return input()

    # gets a file path
    async def getFilePath(self, metadata) -> str:
        return input()
    
    async def getFolder(self, metadata) -> str:
        return self.getFilePath()
    
    # output message
    async def output(self, message) -> None:
        print(message)
    
    async def notify(self, message) -> None:
        print(message)

class TextInterface(Interface):
    def __init__(self) -> None:
        super().__init__()

    # gets a Command from user
    def getCommand(self) -> PluginCommands:
        self.output("Enter a command")
        input = self.getText()
        if input not in self.commandMap.keys():
            self.output("Invalid input. Type 'help' for a list of commands.")
            return self.getCommand()
        else:
            return self.commandMap[input]

    def getArgument(self, arg : Input) -> str:
        # call the function that retrieves this type of argument
        input = self.inputGetterMap[arg.type](arg.metadata)
        # check if input is valid
        try: 
            return arg.parseInput(input)
        except Exception as e:
            # if the user cancels the dialogue box return None
            if input is None:
                return None
            # print error message to user
            self.output(str(e))
            # get Argument again 
            return self.getArgument(arg)
    
    def getCommandArgs(self, command: Command) -> list[str] :
        userInputs = []
        for whichArg in command.args:
            input = self.getArgument(whichArg)
            if input is None:
                return None
            userInputs.append(input)
        return userInputs

class GUInterface(TextInterface):
    
    def __init__(self) -> None:
        super().__init__()
    
    def getText(self, metadata) -> str:
        return enterbox(msg = metadata.prompt)
    
    def getCommand(self, metadata = None) -> PluginCommands:
        input = choicebox("Pick a command", "Menu", self.commandMap.keys()) 
        if (input is None):
            return PluginCommands.END
        return self.commandMap[input]

    # gets a file path
    def getFilePath(self, metadata : InputMetadata) -> str:
        try:
            return fileopenbox(msg=metadata.prompt, default=metadata.default_location + r"\\*")
        except Exception:
            raise Exception(Errors.folder_does_not_exist(metadata.default_location))

    def getFolder(self, metadata : InputMetadata) -> str:
        try:
            return diropenbox(msg=metadata.prompt, default=metadata.default_location)
        except Exception:
            raise Exception(Errors.folder_does_not_exist(metadata.default_location))
    
    def output(self, message) -> None:
        msgbox(message)


        
    
    
class ElectronInterface(TextInterface):
    
    def __init__(self) -> None:
        super().__init__()
        self.bridge = MessageQueue()
        self.pending_command = None
        self.pending_args = None
        self.solver_path = None
        
    async def getSolverPath(self) -> str:
        # Request solver path from Electron settings
        request = json.dumps({"type": "get_solver_path"})
        await self.bridge.send("settings_request", request)
        response = await self.bridge.recieve()
        
        if response.get('type') == 'solver_path':
            self.solver_path = response['path']
            return self.solver_path
            
        if not response or not response.get('solver_path'):
            await self.notify("Please configure the solver path in settings")
            return None
            
        self.solver_path = response['solver_path']
        return self.solver_path
        
    async def getCommand(self) -> PluginCommands:
        # Wait for React app to send the command via electron_bridge
        commandKey = await self.bridge.recieve()
        if commandKey not in self.commandMap:
            await self.notify(f"Invalid command: {commandKey}")
            return await self.getCommand()
        return self.commandMap[commandKey]
    
    def getCommandArgs(self, command: Command) -> list[str]:
        # Return args that were set along with the command
        return self.pending_args
    
    def set_command_with_args(self, command_str, args):
        # Called by electron_bridge when React submits a command
        self.pending_command = self.commandMap[command_str]
        self.pending_args = args
        
    async def notify(self, message) -> None:
        # Send message back to React via electron_bridge
        await self.bridge.send("notification", message)

    async def getText(self, metadata) -> str:
        while True:
            request = json.dumps({"type": "text", "message": metadata.prompt})
            await self.bridge.send("text_input", request)
            response = await self.bridge.recieve()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue
    
    async def getFilePath(self, metadata : InputMetadata) -> str:
        while True:
            request = json.dumps({"type": "filepath", "message": metadata.prompt})
            await self.bridge.send("file_input", request)
            response = await self.bridge.recieve()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue

    async def getFolder(self, metadata : InputMetadata) -> str:
        while True:
            request = json.dumps({"type": "folder", "message": metadata.prompt})
            await self.bridge.send("folder_input", request)
            response = await self.bridge.recieve()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue
    
    def output(self, message) -> None:
        asyncio.create_task(self.notify(message))