from __future__ import annotations
from menu import PluginCommands, Command
from treeops import TreeOperator
from inputs import WeightsFile, BoardFile, Board
from stringFunc import removeExtension, timestamp, toFloat, get_file_name_from_path
from SolverConnection.solver import Solver
from solverCommands import SolverCommmand
from typing import Callable, Any, Optional
from fileIO import addRowstoCSV
import unittest
import shutil
import asyncio


consoleLog = True

class Program:
    
    def __init__(self, connection: Solver, notify_func: Callable[[str], None]):
        """
        Initialize the Program with a solver connection and notification function
        
        Args:
            connection: The Solver connection
            notify_func: Function to notify the UI with messages
            get_input_func: Function to get inputs from the UI (optional)
        """
        self.connection = connection
        self.command = SolverCommmand(connection)
        # Replace interface with direct function calls
        self.notify = notify_func
        
        # Add pending command and arguments
        self.pending_command = None
        self.pending_args = None
        
        #maintain a mapping of the commands to the functions that run them
        self.commandDispatcher : dict[Command, Callable[[list[str]], None]] = { 
            PluginCommands.NODELOCK_SOLVE: self.nodelock_solve,
            PluginCommands.NODELOCK_SOLVE_MINI: self.nodelock_solve_mini,
            PluginCommands.RUN_AUTO: self.solve,
            PluginCommands.RUN_FULL_SAVE: self.solve_full,
            PluginCommands.NODELOCK: self.nodelock,
            PluginCommands.GET_RESULTS: self.get_results,
            PluginCommands.SAVE_NO_RIVERS: self.resave_no_rivers,
            PluginCommands.SAVE_NO_TURNS: self.resave_no_turns,
            PluginCommands.SET_ACCURACY: self.update_accuracy,
            PluginCommands.END: self.end}
         
    async def start(self) -> None:
        while True:
            await self.commandRun()    
    
    def nodelock_solve_mini(self, args : list[str]):
        self.nodelock_get_results_save(args, solve=True, auto_size=True)
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    def resave_no_turns(self, args : list [str]):
        self.resave(args[0][0], args[0][1], "no_turns")
        
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    def resave_no_rivers(self, args : list [str]):
        self.resave(args[0][0], args[0][1], "no_rivers")
        
    def resave(self, folder : str, files : str, save_type : str):
        pio = SolverCommmand(self.connection)
        for cfr in files:
            pio.load_tree(folder + "\\" + cfr)
            pio.saveTree([folder + "\\" + cfr, save_type])
            pio.run_until("free_tree", "free_tree ok!")
            self.notify("Resaved " + cfr + ".")
        
    # new accuracy of solverq
    def update_accuracy(self, args : list[str]):
        self.connection.accuracy = toFloat(args[0])
        
    async def commandRun(self, inputtedCommand : Command = None, inputtedArgs : list[str] = None):
        await self.commandDispatcher[inputtedCommand](inputtedArgs)
        if (inputtedCommand != PluginCommands.END):
            await self.commandRun()
        else:
            await self.end([])
        
    async def tryFunction(self, func, args : list):
        try:
            #command not meant to have any inputs
            if args is None or len(args) == 0:
                return await func()
            #command meant to take a single input
            elif type(args) != list or len(args) == 1:
                return await func(args[0])
            #command meant to take a list of
            else:
                return await func(args)
        except Exception as e:
            await self.notify(str(e))
            return None
        
    # arg[0] = nodeID
    # returns the action frequencies for the sister and children nodes of the target node
    def getAllFrequencies(self, args: list) :
        treeOp = TreeOperator(self.connection)
        family = treeOp.get_family(args[0])
        sisterFrequencies = []
        childFrequencies = []
        for s in family.sisters:
            #sisterFrequencies[s] = self.getActionFrequency(s)
            sisterFrequencies.append(self.getActionFrequency(s))
        for c in family.children:
            #childFrequencies[c] = self.getActionFrequency(c)
            childFrequencies.append(self.getActionFrequency(c))
    
        return [sisterFrequencies, childFrequencies]
        
    
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
        
    
    def make_title(self, family):
        title = ["File", "Node", "EVs at root", "EV OOP", "EV IP", "OOP MES","IP MES","frequencies at node"]
        for s in family.sisters:
            title.append(BoardFile.getLastDecision(s))
        title.append("frequencies after node")
        for c in family.children:
            title.append(BoardFile.getLastDecision(c))
        return title
        
    def run_cfr(self, folder : str, cfrFiles : list[str], nodeBook, solveFirst = True, needsTitle = True, needsLoading = True, save_type = None, publish_results = True):
        pio = SolverCommmand(self.connection)
        
        # arrays that will be written to CSV file
        toCSV = []
        
        for cfr in cfrFiles:
            # The line `nodeID = self.tryFunction(self.get_file_nodeID, [cfr, nodeBook])` is calling
            # the `tryFunction` method with arguments `self.get_file_nodeID` as the function to try
            # and `[cfr, nodeBook]` as the arguments to pass to that function.
            loaded = False
            nodeID = self.tryFunction(self.get_file_nodeID, [cfr, nodeBook])
            if nodeID:
                if needsLoading:
                    if self.tryFunction(pio.load_tree, [folder + "\\" + cfr]):
                        loaded = True
                else:
                    loaded = True
                    
                if loaded:
                    if solveFirst:
                        self.notify(cfr +  "     " + nodeID)
                    thisLine = [cfr, nodeID]
            
                    t = TreeOperator(connection = self.connection)
                    family = self.tryFunction(t.get_family,[nodeID])
                    if needsTitle:
                        toCSV.append(self.make_title(family))
                        needsTitle = False
                
                    #------------------run solver-------------------
                    if solveFirst:
                        self.notify("Solving " + cfr + " to an accuracy of " + str(self.connection.accuracy) + ".")
                        self.tryFunction(pio.solve, [])
                    
                    #------------------attach EVs for this .cfr file to this CSV line---------------------
                    thisLine.append("   ")
                    
                    evs = self.tryFunction(pio.getEV, [])
                    if evs:
                        thisLine.extend(evs)
                        
                    #------------------attach action frequencies for this .cfr file to this CSV line--------------------
                    thisLine.append("   ")
                    
                    for s in family.sisters:
                        freq = self.tryFunction(pio.getActionFrequency, [[s]])
                        if freq == 0 or freq:
                            thisLine.append(str(freq))
                    
                    #------------------attach post-node action frequencies for this .cfr file to this CSV line---------------------
                    thisLine.append("   ")
                    
                    for c in family.children:
                        freq = self.tryFunction(pio.getActionFrequency, [[c]])
                        if freq == 0 or freq:
                            thisLine.append(str(freq))

                    
                    #-------------------if solver was run, save file-----------------------------------
                    if solveFirst:
                        savePath = folder + r"\\" + cfr
                        self.tryFunction(pio.saveTree,[savePath, save_type])
                        msg = "Saved to: " + savePath
                        if (save_type):
                            msg = msg = "Saved to: " + savePath + " using " + save_type
                        self.notify(msg)
                    
                    #append results for this cfr to csv
                    toCSV.append(thisLine)
        
        
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
        
        pio = SolverCommmand(self.connection)
        path = folder + "\\" + "NODELOCK_" + removeExtension(weights_file_name) + "__" + removeExtension(nodeBook_file_name) + "\\"
        
        save_type = None
        if auto_size:
            save_type = Program.get_save_type(board_type)
    
        unsolved = []
        solved = []
        
        needsTitle = True
        
        for cfr in cfrFiles:
            nodeID = self.tryFunction(self.get_file_nodeID, [cfr, nodeBook])
            if nodeID:

                self.notify("Now working on...." + cfr + " - " + nodeID)
                # set strategy
                if self.tryFunction(pio.load_tree, [folder + "\\" + cfr]):
                    self.notify(cfr + " loaded!")
                    treeOp = TreeOperator(self.connection)
                    
                    family = self.tryFunction(treeOp.get_family,[nodeID])
                    if needsTitle:
                        title = self.make_title(family)
                        solved.append(title)
                        unsolved.append(title)
                        needsTitle = False
                        
                    self.tryFunction(treeOp.set_strategy, [nodeID, weights_map].copy())
                    self.notify("Strategy set for " + cfr) 
                
                    # dump tree
                    self.tryFunction(pio.saveTree, [path + cfr, save_type])
                    msg = "Saved to " + path + cfr
                    if (save_type):
                        msg = "Saved to " + path + cfr + " using " + save_type + " save."
                    self.notify(msg)
                    
                    # get results
                    before_solving = self.run_cfr(path, [cfr], nodeBook, solveFirst = False, needsTitle= False, needsLoading=False, save_type = save_type, publish_results=False)
                    unsolved.extend(before_solving)
                    if (solve):
                        results = self.run_cfr(path, [cfr], nodeBook, solveFirst = True, needsTitle= False, needsLoading=False, save_type = save_type, publish_results=False)
                        solved.extend(results)
                    
                    
                    self.tryFunction(pio.free_mem, [])
                else:
                    #self.connection.command("show_tree_info")
                    self.connection = pio.resetConnection()
                    
        toCSV = [[" ", "BEFORE SOLVING"], [""]]
        toCSV.extend(unsolved)
        if solve:
            toCSV.extend([[""], [" ", "SOLVED"], [""]])
            toCSV.extend(solved)
            
            
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
        
    #args[0] : file Name
    #args[1] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    def get_file_nodeID(self, args: list[str]):
        file = args[0]
        nodeBook = args[1]
        
        match nodeBook:
            # there is only one node
            case str():
                return nodeBook
            # each file has unique node
            case dict():
                # check if file is in nodeBook
                if (file in nodeBook):
                    return nodeBook[file]
                # perhaps the user entered file names sans extension
                elif (removeExtension(file) in nodeBook):
                    return nodeBook[removeExtension(file)]
                else:
                    raise Exception(file + " not specified in nodeBook file.")
    
    # args[0][0] : the folder path
    # args[0][1] : list of .cfr files
    # args[1] : map of category names -> weights
    # args[2] : [either a string with the nodeID or a map with .cfr file names -> file-specific nodeIDs, board_type]
    def nodelock_solve(self, args : list[str]):
        self.nodelock_get_results_save(args, solve=True, auto_size=False)
        
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
