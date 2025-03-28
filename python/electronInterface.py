from interface import Interface
from bridge import MessageQueue
import asyncio
import json
from menu import Command, PluginCommands
from inputs import InputMetadata

class ElectronInterface(Interface):
    
    def __init__(self) -> None:
        super().__init__()
        self.bridge = MessageQueue()
        self.pending_command = None
        self.pending_args = None
        self.solver_path = None
        
    async def getSolverPath(self) -> str:
        # Request solver path from Electron settings
        request = json.dumps({"type": "get_solver_path"})
        response = await self.bridge.send(request)
        
        if response and response.get('type') == 'solver_path':
            self.solver_path = response['path']
            return self.solver_path
            
        if not response or not response.get('solver_path'):
            await self.notify("Please configure the solver path in settings")
            return None
            
        self.solver_path = response['solver_path']
        return self.solver_path
        
    async def getCommand(self) -> PluginCommands:
        # Wait for React app to send the command via electron_bridge
        commandKey = await self.bridge.receive()
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
        await self.bridge.send(message)

    async def getText(self, metadata) -> str:
        while True:
            request = json.dumps({"type": "text", "message": metadata.prompt})
            await self.bridge.send(request)
            response = await self.bridge.receive()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue
    
    async def getFilePath(self, metadata : InputMetadata) -> str:
        while True:
            request = json.dumps({"type": "filepath", "message": metadata.prompt})
            await self.bridge.send(request)
            response = await self.bridge.receive()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue

    async def getFolder(self, metadata : InputMetadata) -> str:
        while True:
            request = json.dumps({"type": "folder", "message": metadata.prompt})
            await self.bridge.send(request)
            response = await self.bridge.receive()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue
    
    def output(self, message) -> None:
        asyncio.create_task(self.notify(message))
        
    async def start_bridge(self):
        print("Starting bridge")
        # Simply calls the run method of the MessageQueue
        await self.bridge.run()
