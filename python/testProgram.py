from __future__ import annotations
from menu import PluginCommands, Command
from inputs import Board
from stringFunc import removeExtension, timestamp, get_file_name_from_path
from SolverConnection.testSolver import Solver
from solverCommands import SolverCommmand
from typing import Callable
from fileIO import addRowstoCSV
import unittest
import shutil
import random
import asyncio
import os
from fileIO import JSONtoMap
from bridge import Message

class Program:
    
    def __init__(self, connection: Solver, notify_func: Callable[[str], None]):
        """
        Initialize the Program with a solver connection and notification function
        
        Args:
            connection: The solver connection
            notify_func: Function to call for notifications
        """
        self.connection = connection
        self.notify = notify_func
        self.results_dir = None  # Will be set via message from frontend
        self.accuracy = 0.02  # Default accuracy
        
    def set_results_dir(self, path: str):
        """Set the results directory path"""
        self.results_dir = path
        self.notify(f"Results directory set to: {path}")
        
    def get_results_path(self, filename: str) -> str:
        """Get the full path for a results file"""
        if self.results_dir:
            return os.path.join(self.results_dir, filename)
        # Default to cfr folder if no results dir set
        return os.path.join(os.path.dirname(os.getcwd()), filename)
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    async def resave_no_turns(self, args : list [str]):
        await self.resave(args[0][0], args[0][1], "no_turns")
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    async def resave_no_rivers(self, args : list [str]):
        await self.resave(args[0][0], args[0][1], "no_rivers")
        
    async def resave(self, folder : str, files : str, save_type : str):
        for cfr in files:
            await asyncio.sleep(random.uniform(1, 3))
            self.notify("Resaved " + cfr + ".")
        
    # new accuracy of solver
    async def update_accuracy(self, args : list[str]):
        await asyncio.sleep(random.uniform(1, 3))
        self.notify("Accuracy set to " + args[0] + ".")
    
    async def commandRun(self, inputtedCommand : Command = None, inputtedArgs : list[str] = None):
        command_name = inputtedCommand.name
        # Direct method dispatch based on command name
        if command_name == 'nodelock_solve_full':
            print("Detected nodelock_solve_full command, calling directly")
            await self.nodelock_solve(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'nodelock_solve_mini':
            print("Detected nodelock_solve_mini command, calling directly")
            await self.nodelock_solve_mini(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'nodelock':
            await self.nodelock(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'nodelock_mini':
            await self.nodelock_mini(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'run_mini':
            await self.solve(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'run_full':
            await self.solve_full(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'get_results':
            await self.get_results(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'save_no_rivers':
            await self.resave_no_rivers(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'save_no_turns':
            await self.resave_no_turns(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'set_accuracy':
            await self.update_accuracy(inputtedArgs)
            self.notify("Command completed.")
            return
        elif command_name == 'end':
            await self.end(inputtedArgs)
            self.notify("Command completed.")
            return
        else:
            # If no direct match, raise error
            print(f"Command '{command_name}' not recognized!")
            raise KeyError(f"Unknown command: {command_name}")
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1][0] : either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs
    async def solve(self, args: list[str]):
        nodeBook = args[1][0]
        board_type = args[1][1]
        nodeBook_file_name = get_file_name_from_path(args[1][2])
        save_type = Program.get_save_type(board_type)
        
        await self.run_cfr(args[0][0], args[0][1], args[1][0], save_type = save_type)
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1][0] : either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs
    async def solve_full(self, args: list[str]):
        await self.run_cfr(args[0][0], args[0][1], args[1][0])

    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1][0] : either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs
    async def get_results(self, args: list[str]):
        await self.run_cfr(args[0][0], args[0][1], args[1][0], solveFirst = False)
        
    
        
    async def run_cfr(self, folder : str, cfrFiles : list[str], nodeBook, solveFirst = True, needsTitle = True, needsLoading = True, save_type = None, publish_results = True):
        
        # arrays that will be written to CSV file
        toCSV = []
        
        for cfr in cfrFiles:  
          if solveFirst:
            self.notify("Solving " + cfr + " to an accuracy of " + str(self.accuracy) + ".")
            await asyncio.sleep(random.uniform(1, 3))
            savePath = folder + r"\\" + cfr
            await asyncio.sleep(random.uniform(1, 3))
            msg = "Saved to: " + savePath
            if (save_type):
                msg = "Saved to: " + savePath + " using " + save_type
                self.notify(msg)
                    
            #append results for this cfr to csv
            toCSV.append(["", "", "", "", "", "", "", "", ""])
        
        
        if publish_results:
            await self.publish_results(folder, toCSV, solved = solveFirst)
        
        return toCSV
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    async def nodelock_get_results_save(self, args : list[str], solve = False, auto_size = False):
        folder, cfrFiles = args[0]
        weights_file_path = args[1]
        weights_file_name = get_file_name_from_path(weights_file_path)
        weights_map = JSONtoMap(weights_file_path)
        
        nodeBook = args[2][0]
        board_type = args[2][1]
        nodeBook_file_name = get_file_name_from_path(args[2][2])
        
        needsTitle = True
        
        path = folder + "\\" + "NODELOCK_" + removeExtension(weights_file_name) + "__" + removeExtension(nodeBook_file_name) + "\\"
        
        save_type = None
        if auto_size:
            save_type = "no rivers"
        
        for cfr in cfrFiles:
            nodeID = "target node"
            if nodeID:

                self.notify("Now working on...." + cfr + " - " + nodeID)
                # set strategy
                if True:
                    self.notify(cfr + " loaded!")
                    await asyncio.sleep(random.uniform(1, 3))
                    self.notify("Strategy set for " + cfr) 
                
                    # dump tree
                    await asyncio.sleep(random.uniform(1, 3))
                    msg = "Saved to " + path + cfr
                    if (save_type):
                        msg = "Saved to " + path + cfr + " using " + save_type + " save."
                    self.notify(msg)
                    
                    # get results

 
                    
        toCSV = [[" ", "BEFORE SOLVING"], [""]]
        if solve:
            toCSV.extend([[""], [" ", "SOLVED"], [""]])
            
            
        #shutil.copyfile(weights_file_path, path + weights_file_name)
        await self.publish_results(path, toCSV, solve)
        
        return path
        
    
    async def publish_results(self, folder:str, toCSV: list[list[str]], solved = True):
        path = self.get_results_path("results_" + timestamp() + ".csv")
        if not solved:
            path = self.get_results_path("unsolved_results" + ".csv")

        addRowstoCSV(path, toCSV)
        
        msg = "Saved results to " + path
        if not solved:
            msg = "Saved unsolved results to " + path
        
        self.notify(msg)
        

    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    async def nodelock_solve(self, args : list[str]):
        await self.nodelock_get_results_save(args, solve=True, auto_size=False)
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    async def nodelock_solve_mini(self, args : list[str]):
        """
        Similar to nodelock_solve but optimized for mini boards with simplified processing
        """
        await self.nodelock_get_results_save(args, solve=True, auto_size=True)
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    async def nodelock(self, args : list[str]):
        await self.nodelock_get_results_save(args, auto_size=False)


    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    async def nodelock_mini(self, args : list[str]):
        await self.nodelock_get_results_save(args, auto_size=True)
        
    @staticmethod
    def get_save_type(board_type : Board):
        save_type = None
        match board_type:
            case Board.FLOP:
                save_type = "no_turns"
            case Board.TURN:
                save_type = "no_rivers"
            case Board.RIVER:
                save_type = "full"
        
        return save_type
        
    async def end(self, args : list[str] = None):
        """End the program"""
        self.notify("Ending program.")
        await asyncio.sleep(random.uniform(1, 3))
        
if __name__ == '__main__': 
    unittest.main() 
