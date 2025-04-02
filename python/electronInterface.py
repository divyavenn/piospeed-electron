from interface import Interface
from Message import Message

class ElectronInterface(Interface):
    
    def __init__(self,) -> None:
        super().__init__()
        self.pending_command = None
        self.pending_args = None
        self.commandMap = {}
    

    async def notify(self, message, msg_type = "notification") -> None:
        # Send message back to React via electron_bridge
        await self.bridge.send(Message(msg_type, message))

    def set_command_with_args(self, command_str, args):
        """Set the command and arguments to be executed"""
        from menu import PluginCommands
        self.pending_command = self.commandMap.get(command_str)
        self.pending_args = args
        print(f"Set command {command_str} with args {args}")

    async def getText(self, metadata) -> str:
        """Request text input from the user"""
        while True:
            print(f"Requesting text input: {metadata.prompt}")
            await self.bridge.send(Message("input_request", {
                "type": "text", 
                "prompt": metadata.prompt
            }))
            
            # Wait for response from Electron
            response = await self.bridge.wait_for_input_response()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue
    
    async def getFilePath(self, metadata) -> str:
        """Request file path input from the user"""
        while True:
            print(f"Requesting file path: {metadata.prompt}")
            await self.bridge.send(Message("input_request", {
                "type": "filepath", 
                "prompt": metadata.prompt
            }))
            
            # Wait for response from Electron
            response = await self.bridge.wait_for_input_response()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue

    async def getFolder(self, metadata) -> str:
        """Request folder path input from the user"""
        while True:
            print(f"Requesting folder path: {metadata.prompt}")
            await self.bridge.send(Message("input_request", {
                "type": "folder", 
                "prompt": metadata.prompt
            }))
            
            # Wait for response from Electron
            response = await self.bridge.wait_for_input_response()
            
            try:
                return metadata.parseInput(response)
            except Exception as e:
                await self.notify(str(e))
                continue
    
    async def getCommand(self):
        """Get the pending command"""
        return self.pending_command
    
    def getCommandArgs(self, command):
        """Get the arguments for the pending command"""
        return self.pending_args
    
    def output(self, message):
        """Output a message to the Electron frontend"""
        import asyncio
        asyncio.create_task(self.notify(message))
