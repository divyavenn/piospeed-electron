from __future__ import annotations
from menu import Command, PluginCommands
from inputs import InputType, Input
import os

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
    
    def getArgument(self, arg : Input) -> str:
        return input()
    
    # output message
    async def output(self, message) -> None:
        print(message)
    
    async def notify(self, message) -> None:
        print(message)
        
    def getCommandArgs(self, command: Command) -> list[str] :
        userInputs = []
        for whichArg in command.args:
            input = self.getArgument(whichArg)
            if input is None:
                return None
            userInputs.append(input)
        return userInputs

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



        
