
from __future__ import annotations
from stringFunc import parseEV, toFloat, parseTreeInfoToMap, parseNodeIDtoList, makeNodeIDfromList
from inputs import BoardFile, Decisions
from SolverConnection.solver import Solver
from decimal import Decimal
from treeops import TreeOperator, normalizeWeight, nodeInfo
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
        
    
        