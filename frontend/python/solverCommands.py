
from __future__ import annotations
from stringFunc import parseEV, toFloat, parseTreeInfoToMap, parseSettingsToMap, parseNodeIDtoList, makeNodeIDfromList
import unittest
from inputs import BoardFile, Decisions
from global_var import solverPath
from SolverConnection.solver import Solver
from decimal import Decimal
from treeops import TreeOperator, normalizeWeight, nodeInfo
from fileIO import addRowstoCSV, addRowtoCSV, IO
consoleLog = False

# functions that transmit commands to the solver to get correct output
class SolverCommmand():
    def __init__(self, connection) -> None:
        self.connection = connection
    
    

    def tryPio(self, func, args : list): 
        if consoleLog:
            for a in args:
                print("---- " + a)
        try:
            #command not meant to have any inputs
            if args is None or len(args) == 0:
                return func() or True
            #command meant to take a single input
            elif len(args) == 1:
                return func(args[0]) or True
            #command meant to take a list of
            else:
                return func(args) or True
        except Exception as e:
            self.connection.exit()
            if consoleLog:
                print(str(e) + ",   called with :")
                for a in args:
                    print("\t --- " + str(a))
            raise e
            return False
    
    def try_and_ignore_pio(self, func, args : list): 
        if consoleLog:
            for a in args:
                print("---- " + a)
        try:
            #command not meant to have any inputs
            if args is None or len(args) == 0:
                return func()
            #command meant to take a single input
            elif len(args) == 1:
                return func(args[0])
            #command meant to take a list of
            else:
                return func(args)
        except Exception as e:
            print(e)
            for a in args:
                print("---- " + a)
        
    
    def run_until(self, command, confirmation):
        self.tryPio(self.connection.write_line, [command])
        self.tryPio(self.connection.wait_line, [confirmation])
        self.tryPio(self.connection.read_until_end, [])
        return True
    
    def free_mem(self):
        self.run_until("free_tree", "free_tree ok!")
        
    def load_tree(self, cfrFilePath) :
        if self.run_until("load_tree \"" + cfrFilePath + "\"", "load_tree ok!"):
            if self.run_until("load_all_nodes", "load_all_nodes ok!"):
                if self.run_until("rebuild_forgotten_streets", "rebuild_forgotten_streets ok!"):
                    self.setAccuracy([self.connection.accuracy])
                    return True
        else:
            return False

    def getTreeInfo(self):
        self.tryPio(self.connection.command, [""])
    
    def solve(self):
        self.tryPio(self.connection.command, ["go" ])
        self.tryPio(self.connection.write_line, ["wait_for_solver"])
        self.tryPio(self.connection.wait_line, ["wait_for_solver ok!"])
        self.tryPio(self.connection.read_until_end, [])
        
    # no args
    def getEV(self) :
        op = self.tryPio(self.connection.command, ["calc_results"])
        
        return parseEV(op)

    def resetConnection(self):
        self.connection.exit()
        self.connection = Solver(solverPath)
        return self.connection
    
    # arg[0] = nodeID
    
    def get_local_frequency(self, nodes, freq) :
        #print("\n local freq: " + str(freq))
        nodes = nodes[:-1]
        parent = makeNodeIDfromList(nodes)
        k = toFloat((self.tryPio(self.connection.command, ["calc_line_freq " + parent]))[0])
        #print("line freq: " + str(k))
        return freq/k 

        
    def getActionFrequency(self, args : list) :
        nodeID = args[0]
        line_freq = self.tryPio(self.connection.command, ["calc_line_freq " + nodeID])
        local_frequency = self.get_local_frequency(parseNodeIDtoList(nodeID), toFloat(line_freq[0]))
        
        return round(local_frequency, 4) * Decimal(100)
    
    
    # arg[0] = percentage
    def setAccuracy(self, args : list) :
        percent = normalizeWeight(args[0])
        pioOutput = self.tryPio(self.connection.command, ["show_tree_info"])
        if consoleLog:
            print("TREE INFO: \n")
            for p in pioOutput:
                print(p)
            print("----------------------------") 
               
        info = parseTreeInfoToMap(pioOutput)
        
        if consoleLog:
            for i in info:
                print(i)

                
        accuracy = info["Pot"] * Decimal(percent)
        self.tryPio(self.connection.command, ["set_accuracy " + str(accuracy)])
        
    
    # arg[0] = nodeId    
    def createSubtree(self, args : list):
        nodeID = args[0]
        t = TreeOperator(self.connection)
        
        info : nodeInfo = t.getNodeInfo(nodeID)
        oop_range, ip_range = t.getRange(nodeID)
        
        self.tryPio(self.connection.command, ["set_range OOP " + oop_range])
        self.tryPio(self.connection.command, ["set_range IP " + ip_range])
        self.tryPio(self.connection.command, ["set_pot " + info.pot])
        self.tryPio(self.connection.command, ["set_board " + info.board])
        
        self.run_until("build_tree", "build_tree ok!")
        
        
    # arg[0] = path
    # arg[1] = "full", "no_rivers", "no_turns"
    def saveTree(self, args : list) :
        command = "dump_tree \"" + args[0] + "\""
        if len(args) > 1 and args[1]:
            command = command + " " + args[1]
        self.run_until(command, "dump_tree ok!")
    
def parseNodeLinetoBetSizes (line : str) -> str:
    size = 0
    previousSize = 0
    bet_sizes = ""
    decisions = BoardFile.makeDecisionList(line)
    #remove root
    decisions.pop(0)
    for d in decisions:
        if d == Decisions.FOLD:
            bet_sizes = bet_sizes + str(previousSize) 
        else:
            previousSize = size
            if type(d) is str:
                size = size + int(toFloat(d))
            bet_sizes = bet_sizes + str(size) + " "
        # print("size :" + str(size) + ", previous size :" + str(previousSize))
    
    
    return bet_sizes
        
    
        
class Tests(unittest.TestCase):
    
    
    def getEVs(self):
        self.connection = Solver(solverPath)
        self.pio = SolverCommmand(self.connection)
        testFiles = {"KdTc9h_small.cfr" : [36.790, 16.210] ,
                     "Qh6c5s_small.cfr" : [22.573, 30.427] ,
                     "As5h3s_small.cfr" : [28.865, 24.135]}
        for file in testFiles:
            self.pio.load_tree(r"C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\\" + file)
            oop, ip = self.pio.getEV()
            right_oop, right_ip = testFiles.get(file)
            self.assertAlmostEqual(toFloat(oop), right_oop, delta = .005)
            self.assertAlmostEqual(toFloat(ip), right_ip, delta = .005)
            
        self.connection.exit()
    

    def SetAccuracy(self):
        self.connection = Solver(solverPath)
        self.pio = SolverCommmand(self.connection)
        self.pio.load_tree(r"C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\KdTc9h.cfr")
        
        info = parseTreeInfoToMap(self.connection.command("show_tree_info"))
        self.assertEqual(info["Pot"], Decimal('55'))
        settings = parseSettingsToMap(self.connection.command("show_settings"))
        self.assertEqual(settings["accuracy"], Decimal('0.11'))
        
        
        self.pio.setAccuracy([.01]) 
        settings = parseSettingsToMap(self.connection.command("show_settings"))
        self.assertEqual(settings["accuracy"], Decimal(".55"))
        
        self.connection.exit()
            
    def testFrequencies(self):
        self.connection = Solver(solverPath)
        self.pio = SolverCommmand(self.connection)
        
        
        nodes = ["r:0:c:b16", "r:0:c:c", "r:0:c:b16:c", "r:0:c:b16:b68", "r:0:c:b16:f", "r:0:c:b16:b68:b154", "r:0:c:b16:b68:c", "r:0:c:b16:b68:f"]
        testFiles = {"As5h3s.cfr" : [.5, .5, 0.3333, 0.3333, 0.3333, 0.3333, 0.3333, 0.3333] }
        
        for file in testFiles:
            self.pio.load_tree(r"C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\\" + file)
            for i in range(0, len(nodes)):
                frequency = self.pio.getActionFrequency([nodes[i]]) 
                correct_frequency = testFiles.get(file)[i]
                #try:
                self.assertAlmostEqual(frequency, Decimal(correct_frequency), delta = .0001 )
                #except Exception:
                #    "Failed " + str(file) + "\t" + str(nodes[i])
            
        self.connection.exit()
    
    def Subtree(self):
        self.connection = Solver(solverPath)
        self.pio = SolverCommmand(self.connection)
        
        # load_tree "C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\KdTc9h_small.cfr"
        self.pio.load_tree(r"C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\KdTc9h_small.cfr")
        tree_lines = self.connection.command("show_all_lines")
        
        # created at r:0:c:b16:c:3c:c:b77
        self.pio.load_tree(r"C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\KdTc9h_small_sub.cfr")
        subtree_lines = self.connection.command("show_all_lines")
        
        tree = []
        subtree = []
        not_in_subtree = []
        not_in_tree = []
        
        for line in tree_lines:
            tree.append([line])
            if line not in subtree_lines:
                not_in_subtree.append([line])

                
        
        for line in subtree_lines:
            subtree.append([line])
            if line not in tree_lines:
                not_in_tree.append([line])
                
            
                

        addRowstoCSV("tree.csv", tree, [IO.LOCAL])
        addRowstoCSV("not_in_subtree.csv", not_in_subtree, [IO.LOCAL])
        addRowstoCSV("subtree.csv", subtree, [IO.LOCAL])
        addRowstoCSV("not_in_tree.csv", not_in_tree, [IO.LOCAL])
        
        self.connection.exit()
        
        #self.pio.createSubtree(["r:0:c:b16:c:3c:c:b77"])
        #self.pio.saveTree([r"C:\Users\degeneracy station\Documents\PioSolver-plugin\sample\cfr\KdTc9h_small_subtree.cfr"])
        # show_node r:0:c:b16:c:3c:c:b77
        # show_range OOP r:0:c:b16:c:3c:c:b77
        # show_range IP r:0:c:b16:c:3c:c:b77
        
        
        # set_range OOP 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0.333333343 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343 0 0.333333343 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.333333343 0.333333343 0.333333343
        # set_range IP 0.166666657 0.166666657 0.166666672 0.166666657 0.166666672 0.166666672 0 0 0 0 0 0.166666672 0 0 0 0 0 0.166666672 0 0 0.166666672 0 0 0 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0.166666672 0 0.166666672 0 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0 0.166666672 0.166666672 0.166666672 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.166666672 0 0.166666672 0 0.166666672 0.166666672 0.166666672
        # set_pot 0 0 87
        # set_board KdTc9h3c
        
        pot = 87
        stacks = 959
        board = "KdTc9h3c"

    def NodeLineToBetSize(self):
        self.assertEqual(parseNodeLinetoBetSizes("r:0:c:b16:c:c:b146:b354:b975"), "0 0 16 16 16 16 162 162 516 516 1491 ")
        self.assertEqual(parseNodeLinetoBetSizes("r:0:c:b16:c:c:b146:b354:b975:c"), "0 0 16 16 16 16 162 162 516 516 1491 1491 ")
        self.assertEqual(parseNodeLinetoBetSizes("r:0:c:b16:c:c:b146:b354:b975:f"), "0 0 16 16 16 16 162 162 516 516 1491 516")
        
        
        
if __name__ == '__main__': 
    unittest.main() 