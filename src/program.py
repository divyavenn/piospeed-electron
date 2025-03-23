from __future__ import annotations
from menu import PluginCommands, Command
from interface import Interface, GUInterface
from treeops import TreeOperator
from inputs import WeightsFile, BoardFile, Board, InputMetadata
from stringFunc import removeExtension, timestamp, toFloat, parseTreeInfoToMap, parseSettingsToMap, get_file_name_from_path
from SolverConnection.solver import Solver
from solverCommands import SolverCommmand
from typing import Callable
from fileIO import addRowstoCSV
import unittest
from global_var import solverPath, currentdir, strategies_folder
import shutil


consoleLog = True

class Program:
    
    def __init__(self, connection : Solver, interface : Interface):
        self.connection = connection
        self.command = SolverCommmand(connection)
        self.interface = interface
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
         
    def start(self) -> None :
        self.commandRun()    
    
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
            self.interface.notify("Resaved " + cfr + ".")
        
    # new accuracy of solverq
    def update_accuracy(self, args : list[str]):
        self.connection.accuracy = toFloat(args[0])
        
    def commandRun(self):
        inputtedCommand = self.interface.getCommand()
        inputtedArgs = self.interface.getCommandArgs(inputtedCommand.value)
        if inputtedArgs is None:
            self.commandRun()
        # runs the function in the program class associated with that command
        else:
            self.commandDispatcher[inputtedCommand](inputtedArgs)
            if (inputtedCommand != PluginCommands.END):
                self.commandRun()
    
    def tryFunction(self, func , args : list):
        try:
            #command not meant to have any inputs
            if args is None or len(args) == 0:
                return func()
            #command meant to take a single input
            elif type(args) != list or len(args) == 1:
                return func(args[0])
            #command meant to take a list of
            else:
                return func(args)
        except Exception as e:
            self.interface.notify(str(e))
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
                        self.interface.notify(cfr +  "     " + nodeID)
                    thisLine = [cfr, nodeID]
            
                    t = TreeOperator(connection = self.connection)
                    family = self.tryFunction(t.get_family,[nodeID])
                    if needsTitle:
                        toCSV.append(self.make_title(family))
                        needsTitle = False
                
                    #------------------run solver-------------------
                    if solveFirst:
                        self.interface.notify("Solving " + cfr + " to an accuracy of " + str(self.connection.accuracy) + ".")
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
                        self.interface.notify(msg)
                    
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
                self.interface.notify("-----------------------------------------")
                self.interface.notify("Now working on...." + cfr + " - " + nodeID)
                # set strategy
                if self.tryFunction(pio.load_tree, [folder + "\\" + cfr]):
                    self.interface.notify(cfr + " loaded!")
                    treeOp = TreeOperator(self.connection)
                    
                    family = self.tryFunction(treeOp.get_family,[nodeID])
                    if needsTitle:
                        title = self.make_title(family)
                        solved.append(title)
                        unsolved.append(title)
                        needsTitle = False
                        
                    self.tryFunction(treeOp.set_strategy, [nodeID, weights_map].copy())
                    self.interface.notify("Strategy set for " + cfr) 
                
                    # dump tree
                    self.tryFunction(pio.saveTree, [path + cfr, save_type])
                    msg = "Saved to " + path + cfr
                    if (save_type):
                        msg = "Saved to " + path + cfr + " using " + save_type + " save."
                    self.interface.notify(msg)
                    
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
        
        self.interface.notify(msg)
        
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
        self.interface.output("Closing connection to solver...done!")

    

class Tests(unittest.TestCase):
    def commandDispatcher(self):
        self.assertTrue(callable(self.p.commandDispatcher[PluginCommands.RUN]))
    
    def _nodelock_and_solve_flop(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        dir = r"C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\\"
        folder = dir + r"\cfr\\"
        strategy = WeightsFile(InputMetadata()).parseInput(dir + r"weights\simple_weights.json")
        nodeBook = BoardFile(InputMetadata()).parseInput(dir + r"boards\board_flop.json")
        files = [r"Qh6c5s_small.cfr", r"As5h3s.cfr"]
        
        path = p.nodelock_solve([[folder, files], strategy, nodeBook])
        p.end([])
    
    def test_nodelock_and_solve_flop_not_enough_mem(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        # "C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\cfr\Qh6c5sc.fr"
        dir = r"C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\\"
        folder = dir + r"\cfr\\"
        strategy = WeightsFile(InputMetadata()).parseInput(dir + r"weights\simple_weights.json")
        nodeBook = BoardFile(InputMetadata()).parseInput(dir + r"boards\board_flop.json")
        files = [r"Qh6c5s.cfr", r"As5h3s.cfr",]
        
        path = p.nodelock_solve([[folder, files], strategy, nodeBook])
        p.end([])
    
    def _nodelock_flop(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        dir = r"C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\\"
        folder = dir + r"\cfr\\"
        strategy = WeightsFile(InputMetadata()).parseInput(dir + r"weights\simple_weights.json")
        nodeBook = BoardFile(InputMetadata()).parseInput(dir + r"boards\board_flop.json")
        files = [r"As5h3s.cfr", r"Qh6c5s_small.cfr"]
        
        path = p.nodelock([[folder, files], strategy, nodeBook])
        p.end([])
        
    def nodelock_and_solve_turn(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        dir = r"C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\\"
        folder = dir + r"\cfr\\"
        strategy = WeightsFile(InputMetadata()).parseInput(dir + r"weights\simple_weights.json")
        nodeBook = BoardFile(InputMetadata()).parseInput(dir + r"boards\board_turn.json")
        files = [r"As5h3s.cfr", r"Qh6c5s_small.cfr"]
        
        path = p.nodelock_solve([[folder, files], strategy, nodeBook])
        p.end([])
    
    def _nodelock_turn(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        dir = r"C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\\"
        folder = dir + r"\cfr\\"
        strategy = WeightsFile(InputMetadata()).parseInput(dir + r"weights\simple_weights.json")
        nodeBook = BoardFile(InputMetadata()).parseInput(dir + r"boards\board_turn.json")
        files = [r"As5h3s.cfr", r"Qh6c5s_small.cfr"]
        
        path = p.nodelock([[folder, files], strategy, nodeBook])
        p.end([])
    
    def River(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        dir = r"C:\Users\degeneracy station\Documents\PioSolver-plugin\poker-sim\sample\\"
        folder = dir + r"\cfr\\"
        strategy = WeightsFile(InputMetadata()).parseInput(dir + r"weights\simple_weights.json")
        nodeBook = BoardFile(InputMetadata()).parseInput(dir + r"boards\board_river.json")
        files = [r"As5h3s.cfr"]
        
        path = p.nodelock_and_save([[folder, files], strategy, nodeBook])
        p.end([])
    
    def CaseBuggy(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        folder = r"C:\Users\degeneracy station\Downloads\from_last_time"
        
        #weights = WeightsFile("test").parseInput(folder + r"\weights\simple_weights.json")
        weights = WeightsFile("test").parseInput(folder + r"\weights_2BP_IP_PFR_B_30f_default.json")
        buggyFiles = [r"\og\og.cfr"]
        simple_board = BoardFile("").parseInput(folder + r"\nodeid_x-b16.json")
        
        
        path = p.nodelock_and_save([[folder, buggyFiles], weights, simple_board])
        
        # p.solve_then_get_results([[path, buggyFiles], simple_board])
        p.end([])
    
    def Case1(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        folder = currentdir + r"\sample\tests\testCase1"
        
        #weights = WeightsFile("test").parseInput(folder + r"\weights\simple_weights.json")
        weights = WeightsFile("").parseInput(folder + r"\weights.json")
        buggyFiles = [r"original.cfr"]
        simple_board = BoardFile("").parseInput(folder + r"\nodeBook.json")
        
        
        path = p.nodelock_and_save([[folder, buggyFiles], weights, simple_board])
        
        # p.solve_then_get_results([[path, buggyFiles], simple_board])
        p.end([])
    
    def BugOne(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        folder = currentdir + r"\sample"
        buggyFiles = [ "TcTh6h.cfr", "8d5d4c.cfr", "As5h3s.cfr"]
        buggy_weights = WeightsFile("test").parseInput(folder + r"\buggy_weights.json")
        simple_board = BoardFile("test").parseInput(folder + r"\board_simple.json")
        
        path = p.nodelock_and_save([[folder + r"\\buggy_cfr", buggyFiles], buggy_weights, simple_board])
        
        info = parseTreeInfoToMap(connection.command("show_tree_info"))
        potSize = info["Pot"]
        settings = parseSettingsToMap(connection.command("show_settings"))
        acc = settings["accuracy"]
        print("Accuracy is " + str(acc) + " chips.")
        self.assertEqual(acc, potSize*.002)
        
        
        p.solve_then_get_results([[path, buggyFiles], simple_board])
        p.end([])
    
    def BugTwo(self):
        connection = Solver(solverPath)
        p = Program(connection, GUInterface())
        
        
        folder = currentdir + r"\sample"
        buggyFiles = [ "Qc8cTs.cfr"]
        simple_board = BoardFile("test").parseInput(folder + r"\board_simple.json")
        path = folder + "\\Qc8cTs"
        
        pio = SolverCommmand(connection)
        pio.load_tree(path + "\\" + buggyFiles[0])
        
        
        info = parseTreeInfoToMap(connection.command("show_tree_info"))
        potSize = info["Pot"]
        settings = parseSettingsToMap(connection.command("show_settings"))
        acc = settings["accuracy"]
        print("Accuracy is " + str(acc) + " chips.")
        self.assertEqual(acc, potSize*.002)
        
        
        p.solve_then_get_results([[path, buggyFiles], simple_board])
        p.end([])

        
if __name__ == '__main__': 
    unittest.main() 

