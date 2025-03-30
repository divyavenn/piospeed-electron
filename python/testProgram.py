from __future__ import annotations
from menu import PluginCommands, Command
from inputs import Board
from stringFunc import removeExtension, timestamp, get_file_name_from_path
from SolverConnection.solver import Solver
from solverCommands import SolverCommmand
from typing import Callable
from fileIO import addRowstoCSV
import unittest
import shutil
import random
import time




class Program:
    
    def __init__(self, connection: Solver, notify_func: Callable[[str], None]):
        """
        A test program that merely successfully returns commands or throws errors as requested
        """
        #raise Exception("Initializion failed.")
        
        # Replace interface with direct function calls
        self.notify = notify_func
        
        # Add pending command and arguments
        self.pending_command = None
        self.pending_args = None
        
        #maintain a mapping of the commands to the functions that run them
        self.commandDispatcher : dict[Command, Callable[[list[str]], None]] = { 
            PluginCommands.NODELOCK_SOLVE: self.nodelock_solve,
            PluginCommands.RUN_AUTO: self.solve,
            PluginCommands.RUN_FULL_SAVE: self.solve_full,
            PluginCommands.NODELOCK: self.nodelock,
            PluginCommands.GET_RESULTS: self.get_results,
            PluginCommands.SAVE_NO_RIVERS: self.resave_no_rivers,
            PluginCommands.SAVE_NO_TURNS: self.resave_no_turns,
            PluginCommands.SET_ACCURACY: self.update_accuracy,
            PluginCommands.END: self.end}

    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    def resave_no_turns(self, args : list [str]):
        self.resave(args[0][0], args[0][1], "no_turns")
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    def resave_no_rivers(self, args : list [str]):
        self.resave(args[0][0], args[0][1], "no_rivers")
        
    def resave(self, folder : str, files : str, save_type : str):
        for cfr in files:
            time.sleep(random.uniform(1, 3))
            self.notify("Resaved " + cfr + ".")
        
    # new accuracy of solver
    def update_accuracy(self, args : list[str]):
        time.sleep(random.uniform(1, 3))
        self.notify("Accuracy set to " + args[0] + ".")
        
    async def commandRun(self, inputtedCommand : Command = None, inputtedArgs : list[str] = None):
        await self.commandDispatcher[inputtedCommand](inputtedArgs)
        if (inputtedCommand != PluginCommands.END):
            await self.commandRun()
        else:
            await self.end([])
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1][0] : either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs
    def solve(self, args: list[str]):
        nodeBook = args[1][0]
        board_type = args[1][1]
        nodeBook_file_name = get_file_name_from_path(args[1][2])
        save_type = Program.get_save_type(board_type)
        
        self.run_cfr(args[0][0], args[0][1], args[1][0], save_type = save_type)
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1][0] : either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs
    def solve_full(self, args: list[str]):
        self.run_cfr(args[0][0], args[0][1], args[1][0])

    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1][0] : either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs
    def get_results(self, args: list[str]):
        self.run_cfr(args[0][0], args[0][1], args[1][0], solveFirst = False)
        
    
        
    def run_cfr(self, folder : str, cfrFiles : list[str], nodeBook, solveFirst = True, needsTitle = True, needsLoading = True, save_type = None, publish_results = True):
        pio = SolverCommmand(self.connection)
        
        # arrays that will be written to CSV file
        toCSV = []
        
        for cfr in cfrFiles:  
          if solveFirst:
            self.notify("Solving " + cfr + " to an accuracy of " + str(self.connection.accuracy) + ".")
            time.sleep(random.uniform(1, 3))
            savePath = folder + r"\\" + cfr
            time.sleep(random.uniform(1, 3))
            msg = "Saved to: " + savePath
            if (save_type):
                msg = msg = "Saved to: " + savePath + " using " + save_type
                self.notify(msg)
                    
            #append results for this cfr to csv
            toCSV.append(["", "", "", "", "", "", "", "", ""])
        
        
        if publish_results:
            self.publish_results(folder, toCSV, solved = solveFirst)
        
        return toCSV
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    def nodelock_get_results_save(self, args : list[str], solve = False, auto_size = False):
        folder, cfrFiles = args[0]
        weights_file_path = args[1][0]
        weights_file_name = get_file_name_from_path(weights_file_path)
        weights_map = args[1][1]
        
        nodeBook = args[2][0]
        board_type = args[2][1]
        nodeBook_file_name = get_file_name_from_path(args[2][2])
        
        needsTitle = True
        
        path = folder + "\\" + "NODELOCK_" + removeExtension(weights_file_name) + "__" + removeExtension(nodeBook_file_name) + "\\"
        
        save_type = None
        if auto_size:
            save_type = "no rivers"
        
        for cfr in cfrFiles:
            nodeID = self.tryFunction(self.get_file_nodeID, [cfr, nodeBook])
            if nodeID:

                self.notify("Now working on...." + cfr + " - " + nodeID)
                # set strategy
                if True:
                    self.notify(cfr + " loaded!")
                    time.sleep(random.uniform(1, 3))
                    self.notify("Strategy set for " + cfr) 
                
                    # dump tree
                    time.sleep(random.uniform(1, 3))
                    msg = "Saved to " + path + cfr
                    if (save_type):
                        msg = "Saved to " + path + cfr + " using " + save_type + " save."
                    self.notify(msg)
                    
                    # get results

 
                    
        toCSV = [[" ", "BEFORE SOLVING"], [""]]
        if solve:
            toCSV.extend([[""], [" ", "SOLVED"], [""]])
            
            
        shutil.copyfile(weights_file_path, path + weights_file_name)
        self.publish_results(path, toCSV, solve)
        
        return path
        
    
    def publish_results(self, folder:str, toCSV: list[list[str]], solved = True):
        path = folder + "\\results_" + timestamp() + ".csv"
        if not solved:
            path = folder + "\\unsolved_results" + ".csv"

        addRowstoCSV(path, toCSV)
        
        msg = "Saved results to " + path
        if not solved:
            msg = "Saved unsolved results to " + path
        
        self.notify(msg)
        

    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    def nodelock_solve(self, args : list[str]):
        self.nodelock_get_results_save(args, solve=True, auto_size=True)
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    def nodelock(self, args : list[str]):
        self.nodelock_get_results_save(args, auto_size=True)

    
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
        
    def end(self, args : list[str]):
        # we have to explicitely close the solver process
        self.connection.exit()
        self.notify("Closing connection to solver...done!")

        
if __name__ == '__main__': 
    unittest.main() 
