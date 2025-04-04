from __future__ import annotations
from enum import Enum
from global_var import hand_category_index, draw_category_index, exception_categories
from fileIO import JSONtoMap
from stringFunc import parseNodeIDtoList, toFloat
from errorMessages import Errors
import os



class Extension (Enum):
    cfr = ".cfr"
    csv = ".csv"
    json = ".json"

class InputType (Enum):
    cfr_folder = 1
    weights_file = 2
    board_file = 3
    accuracy = 4
    
        
    
# an input needed by the user, with accompanying prompt
class Input ():
    def __init__(self, type : InputType) :
        self.type = type
            
    # checks if is valid input
    def isValid (self, input: str) -> bool:
        return True
    
    # if Input is valid, return input, otherwise raise Exception
    def parseInput (self, input: str):
        if self.isValid(input) :
            return input
        else:
            raise Exception("Invalid Input")

# a file input with specific extension or extensions needed from the user
class FileInput (Input):
    def __init__(self, type: InputType, extension : Extension):
        super().__init__(type)
        self.extension : str = extension.value
    
    def isCorrectExtension (self, fName : str) :
        # if last few letters of file name equals the extension this input is supposed to have, return true
        if (fName[-1*len(self.extension):]) == self.extension:
            return True
        return False
    
    # check if file type is correct, if so return
    def parseInput(self, input : str) :
        if self.isCorrectExtension(input): 
            return input
        raise Exception(Errors.wrongFileType(self.extension))


class CFRFolder (FileInput) :

    def __init__(self):
        super().__init__(InputType.cfr_folder, Extension.cfr)
    
    # return a list where first element is folder and second element is list of files belonging to this type
    def parseInput(self, input : str) -> list :
        allFilesInside : list [str] = []
        try: 
            allFilesInside = os.listdir(input)
        except Exception:
            raise Exception(Errors.invalidFolder)
        
        neededFiles = []
        # return the files inside the folder which match the needed extension
        for f in allFilesInside:
            if self.isCorrectExtension(f):
                neededFiles.append(f)
        if not neededFiles:
            raise Exception(Errors.invalidFolder + Errors.noFilesinFolder(self.extension))
        return [input, neededFiles]
    
class WeightsFile (FileInput):
    def __init__(self):
        super().__init__(InputType.weights_file, Extension.json)
    
    # input: a file path from the interface
    # output: a map of valid category names and their corresponding weights
    def parseInput(self, input : str) -> dict[str, int] :
        input = super().parseInput(input)
        weightMap : dict = JSONtoMap(input)
        
        for category_name in weightMap:
            validName : bool = category_name in hand_category_index or category_name in draw_category_index
            if not validName:
                raise Exception(Errors.invalidCategory(category_name))
            weight = toFloat(str(weightMap.get(category_name)))
            if type(weight) is str: 
                raise Exception(Errors.numericWeights)
            
            if weight < 0 and category_name not in exception_categories:
                raise Exception(Errors.noNegativeWeights(category_name))
        return [input, weightMap]
    

class Decisions(Enum):
        ROOT = "r:0"
        CHECK = "c"
        # a bet where the size is constant
        BET_SIZE = "b"
        # a bet where the size is file specific
        BET = "bet"
        TURN = "turn"
        RIVER = "river"
        FOLD = "f"
        
        def __str__(self):
            return self.value
        
        @staticmethod
        def getDict():
            return {i.value: i for i in Decisions}

class Board(Enum):
    FLOP = 3
    TURN = 4
    RIVER = 5
    
class BoardFile(FileInput):

    decisionDict = Decisions.getDict()
    
    def __init__(self):
        super().__init__(InputType.board_file,Extension.json)
        
    # input: a file path from the interface
    # output: [a map of cfr file names and their corresponding target nodeIDs, board_type]
    def parseInput(self, input : str) -> dict[str, str] :
        input = super().parseInput(input)
        
        board = JSONtoMap(input)
        
        nodeID = board.get("all")
        if nodeID is None:
            raise Exception (Errors.noDecisionLineError)

        if (len(board) == 1) :
            board_info = BoardFile.hasNoSpecificDecisions(nodeID)
        else:
            board.pop("all")
            # board has only specific file info
            board_info = BoardFile.getSpecificNodeIDs(nodeID, board)
        
        board_info.append(input)
        
        return board_info

    
    @staticmethod
    # checks that there are no decisions that require specifices in one line boards
    def hasNoSpecificDecisions (nodeID : str) -> str: 
        decisions = BoardFile.makeDecisionList(nodeID)
        
        for d in decisions:
            if d in [Decisions.BET, Decisions.TURN, Decisions.RIVER]:
                # append the following 
                raise Exception(Errors.needsSpecificFileInfo)
        return [nodeID, Board.FLOP]

    @staticmethod
    def getLastDecision(nodeID : str) :
        return parseNodeIDtoList(nodeID)[-1]
        

    @staticmethod
    # get the node IDs for each .cfr file 
    def getSpecificNodeIDs (nodeID: str, board : dict) -> dict [str : str]: 
        #add all file names to a new dictionary
        nodeIDPerFile = {}
        for b in board:
            nodeIDPerFile[b] = ""
        
        decisions, board_type  = BoardFile.makeDecisionList(nodeID)
  
        for n in nodeIDPerFile:
            for d in decisions:
                # if the decision is one of these
                if d in [Decisions.ROOT, Decisions.CHECK]:
                    # append the following 
                    nodeIDPerFile[n] = nodeIDPerFile[n] + d.value + ":"
                if d == Decisions.BET_SIZE:
                    nodeIDPerFile[n] = nodeIDPerFile[n] + d.value 
                elif type(d) is str:
                    nodeIDPerFile[n] = nodeIDPerFile[n] + d + ":"
                elif d in [Decisions.TURN, Decisions.RIVER]: 
                    move = board.get(n).pop(0)
                    nodeIDPerFile[n] = nodeIDPerFile[n] + move + ":"
                elif d in [Decisions.BET]:
                    move = board.get(n).pop(0)
                    if type(move) is not int:
                        raise Exception(Errors.nonNumericBetError)
                    nodeIDPerFile[n] = nodeIDPerFile[n] + "b" + str(move) + ":"
             # remove extraneous : at end
            nodeIDPerFile[n] = nodeIDPerFile[n][:-1]
       
        return [nodeIDPerFile, board_type]
        
        
    
            
    @staticmethod
    def makeDecisionList(node: str) -> list[Decisions]:
        nodes = parseNodeIDtoList(node)
        decisionList : list[Decisions]= []
        
        board_type : Board = Board.FLOP
        
        for n in nodes :
            x = BoardFile.getDecisionType(n)
            if (x):
                decisionList.append(x)
            if (x == Decisions.BET_SIZE):
                # if it's a bet with size, append the size of the bet
                decisionList.append(n[1:])
            elif (x == Decisions.TURN) :
                board_type = Board.TURN
            elif (x == Decisions.RIVER) :
                board_type = Board.RIVER
                
        
        if len(decisionList) == 0 or decisionList[0] != Decisions.ROOT:
            raise Exception(Errors.noRootNode)
        
        return [decisionList, board_type]
    
    @staticmethod
    def getDecisionType(node : str):
        if node == "r:0":
            return Decisions.ROOT
        first = node[:1]
        if first == "c" and (len(node) == 1):
            return Decisions.CHECK
        if first == "b":
            if  (len(node) == 1) :
                return Decisions.BET
            elif node[1:].isnumeric() : 
                return Decisions.BET_SIZE
        if first == "f":
            return Decisions.FOLD
        if node == "turn" :
            return Decisions.TURN
        if node == "river" :
            return Decisions.RIVER
        
        
        raise Exception(Errors.invalid_node(node))
        

