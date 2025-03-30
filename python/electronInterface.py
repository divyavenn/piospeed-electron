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
        """
        Wait for the solver path to be sent from Electron.
        This method is called by start.py to initialize the solver path.
        """
        print("Waiting for solver path from Electron...")
        
        # The message_listener in bridge.py will now handle incoming messages
        # This method can return the current solver_path or wait for it to be set
        
        if self.solver_path:
            return self.solver_path
            
        # Wait for a short time to see if we receive the path
        await asyncio.sleep(2)
        return self.solver_path
    
    def setSolverPath(self, path: str) -> None:
        """
        Set the solver path received from Electron.
        This method will be called by the message_listener in bridge.py.
        """
        print(f"Setting solver path to: {path}")
        self.solver_path = path
        # Here you could add code to attempt connecting to the solver
    
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
