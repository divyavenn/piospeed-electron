from __future__ import annotations
from stringFunc import parseStringToList, parseNodeIDtoList, makeNodeIDfromList, parseStrategyToList, makeStrategyFromList, makeString
from global_var import totalCombos, hand_category_index, draw_category_index, exception_categories
from decimal import Decimal, getcontext
from SolverConnection.solver import Solver
import unittest
from inputs import WeightsFile


printConsole = False


def tryPio(connection, func , args : list): 
        try:
            #command not meant to have any inputs
            if args is None or len(args) == 0:
                return func()
            #command meant to take a single input
            elif len(args) == 1:
                return func(args[0])
            #command meant to take a list of inputs
            else:
                return func(args)
        except Exception as e:
            connection.exit()
            raise e

# when entering in weights in JSON, could be decimal or percentage. 
# this accounts for inconsistency in human entry (20% could be typed in as .2 or 20)   
def normalizeWeight(n: float) -> float:
    if (n > 1):
        n = Decimal(n)/Decimal(100)
    return n
    
class nodeFamily():
    def __init__(self, nodeID : str, parent : str = "", index : int = 0, sisters : list[str] = [], children : list[str] = []) -> None:
        self.nodeID = nodeID
        self.parent = parent
        self.index = index
        self.sisters = sisters
        self.children = children

class nodeInfo():
    def __init__(self, nodeID : str, type : str = "", board : str = "", pot : str = "") -> None:
        self.nodeID = nodeID
        self.type = type
        self.board = board
        self.pot = pot
        
class TreeOperator(): 
    def __init__(self, connection):
        self.connection = connection
        if tryPio(self.connection, self.connection.command, ["is_tree_present"]) == "false":
            raise Exception("No tree is loaded; cannot perform tree operations")
        
        getcontext().prec = 9
    
    # args[0] nodeId
    # args[1] weightsFile
    def set_strategy(self, args : list) :
        nodeID = args[0]
        family = self.get_family(nodeID)
        weightMap = args[1]
        
        self.connection.command("unlock_node " + family.parent) 
        
        # the strategy map of the target node and all its sister nodeq
        # format: a list of a list of 1326 floats (one per combo)
        strategy = self.getCurrentStrategyAsList(family.parent)
        
        self.alter_strategy(strategy, weightMap, family.index, nodeID)
        
        if printConsole:
            print("--------------------------------------------------------")
            for s in strategy:
                print(makeString(s))
                print("")
        
        # set the new target strategy in the original pio output 
        strategy = makeStrategyFromList(strategy)
        
        self.connection.command("set_strategy " + family.parent + " " + strategy)
                
        
        self.connection.command("lock_node " + family.parent) 
    
    def getCurrentStrategyAsList(self, nodeID: str) -> list[list[float]] :
        strategy = self.connection.command("show_strategy " + nodeID)
        # turn each individual strategy (string) in the list into a list of numbers
        return parseStrategyToList(strategy) 

    # in order to nodelock a particular decision, we need to reference it by its index number as the child of the parent
    # this takes a node and returns both in the form [parentNodeID, [sister node IDs], index]
    def get_family(self, nodeID : str) -> nodeFamily:
        family = nodeFamily(nodeID=nodeID)
        
        family.children = self.getChildIDs(nodeID)
        nodes = parseNodeIDtoList(nodeID)
        # remove last decision to get parents
        nodes.pop()
        # turn list back into ID
        family.parent = makeNodeIDfromList(nodes)
        family.sisters = self.getChildIDs(family.parent)
        index = 0
        for id in family.sisters:
            if id == nodeID:
                family.index = index
                return family
            index = index + 1
            
        error = "Invalid decision node - the child nodes of " + family.parent + " are: "
        for id in family.sisters:
            error = error + " " + id
        raise Exception(error)
        

    def getChildIDs (self, nodeID : str) -> list[str] :
        # example output: 
        # ['child 0:', 'r:0:c:b16', 'OOP_DEC', 'As 5h 3s', '0 16 55', '3 children', 'flags: PIO_CFR', '', 'child 1:', 'r:0:c:c', 'SPLIT_NODE', 'As 5h 3s', '0 0 55', '49 children', 'flags:', '']
        output = self.connection.command("show_children " + nodeID) 
        childList = []
        child = []
        ids = []
        # split single list into list of lists using delimiter ''
        for o in output:
            if (o == ''):
                childList.append(child)
                child = []
            else:
                child.append(o)
                
        for c in childList:
            ids.append(c[1])
        
        return ids
    
    # gets the info at the current node 
    def getNodeInfo(self, nodeID : str) -> str:
        # example output: ['r:0:c', 'IP_DEC', 'As 5h 3s', '0 0 55', '2 children', 'flags: PIO_CFR', '']
        op : list[str] = self.connection.command("show_node " + nodeID)
        info = nodeInfo(nodeID=nodeID)
        info.type = op[1]
        # gets the board at the current node in a format that can be fed to other commands (remove whitspace to get format like As5h3s)
        info.board = op[2].replace(" ", "")
        info.pot = op[3]
        return info

    # gets range at particular node
    def getRange(self, nodeID : str) -> str:
        oop_range : str = makeString(self.connection.command("show_range OOP " + nodeID))
        ip_range : str = makeString(self.connection.command("show_range IP " + nodeID))
        return [oop_range, ip_range]
       
    def parseCategories(self, nodeID):
        op = self.connection.command("show_categories " + self.getNodeInfo(nodeID).board)
        # a 1326 length list of integers, each referencing the hand category the corresponding combo belongs to.
        hand_per_combo = parseStringToList(op[0])
        draw_per_combo = parseStringToList(op[1])
        return [hand_per_combo, draw_per_combo]

    # checks if category is draw or hand category and updates weights accordingly
    def alter_strategy(self, strategy : list[list[float]], weightMap : dict[str, int], targetIndex: int, targetNodeID : str) -> list[float]:

        # derives the hand and draw categories (their indexes) of combos in target node from pio output
        target_categories = self.parseCategories(targetNodeID)
        target_hand_cats= target_categories[0]
        target_draw_cats = target_categories[1]
        
        for category_name in weightMap:
            # if it is a hand category
            addInsteadOfReplace = category_name in exception_categories
            
            if category_name in hand_category_index:
                # inputs: the current strategy, the index of the target node, the category index corresponding to the category name, the weight of that category)
                strategy = self.update_weight(strategy, targetIndex, target_hand_cats, hand_category_index.get(category_name), weightMap.get(category_name), addInsteadOfReplace)
            # if it is a draw category
            if category_name in draw_category_index:
                strategy = self.update_weight(strategy, targetIndex, target_draw_cats, draw_category_index.get(category_name), weightMap.get(category_name), addInsteadOfReplace)
    
    # alters the combos that belong to the given category to the given weight
    # updates the corresponding combos in the other child nodes to a weight that keeps the proportions of the other strategies the same as before
    def update_weight(self, strategy : list[list[float]], targetIndex : int, categoriesOfCombos : list[int], category : int, category_weight : float, addWeight : bool) -> list[float]:
        '''
        newWeight = Decimal(normalizeWeight(newWeight))
        
        for comboIndex in range(0,totalCombos):
            # if the category of the combo in the target node is equal to the category whose weight we are trying to change
            if categoriesOfCombos[comboIndex] == category:
                
                oldWeight = Decimal(strategy[targetIndex][comboIndex])
                
                finalWeight = newWeight
                if addWeight:
                    finalWeight = oldWeight + newWeight
                    
                if finalWeight < 0:
                    raise Exception("Weight adjustment entered is invalid; cannot have negative percentage")
                
                if (printConsole):
                    print("oldWeight : " + str(oldWeight))
                    print("newWeight : " + str(finalWeight))
                    
                
                
                # iterate through all child nodes
                for childIndex in range(0,len(strategy)) :
                    if childIndex == targetIndex:
                        strategy[childIndex][comboIndex] = finalWeight
                    else :
                        # if the other decisions were 0, make them equally likely
                        if oldWeight == 1:
                            strategy[childIndex][comboIndex] = (Decimal(1) - finalWeight)/(Decimal(len(strategy) - 1))
                        #  if not, multiply a constant that will maintain their relative proportions
                        else:
                            k = (Decimal(1) - finalWeight)/(Decimal(1) - oldWeight)
                            strategy[childIndex][comboIndex] = Decimal(strategy[childIndex][comboIndex])* Decimal(k)
        return strategy
        
        '''
        category_weight = Decimal(normalizeWeight(category_weight))
        wrongTotal = {}
        
        #per combo
        for comboIndex in range(0,totalCombos):
            
            # if the category of the combo is equal to the category whose weight we are trying to change
            if categoriesOfCombos[comboIndex] == category:
                

                # add up weights of all child nodes
                totalWeight = Decimal(0)
                # originalWeightString = "old: "
                
                
                for childIndex in range(0,len(strategy)) :
                    totalWeight = totalWeight + Decimal(strategy[childIndex][comboIndex])
                    #originalWeightString = originalWeightString + " " + str(strategy[childIndex][comboIndex])
                
                # if total weight is more than 0, hand is in range
                if totalWeight > Decimal(0):
                    
                    #wrongTotal = {}
                    original_target_node_weight = Decimal(strategy[targetIndex][comboIndex])
                    if addWeight:
                        category_weight = original_target_node_weight + category_weight
                    
                    category_weight = max(min(100, category_weight), 0)
                    
                    if category_weight < 0:
                        raise Exception("Weight adjustment entered is invalid; cannot have negative percentage")
                    

                    newWeightsTotal = Decimal(0)
                    newWeightStr = "new:"
                    
                    # lastSister = (len(strategy) - 1) if targetIndex != (len(strategy) - 1) else (len(strategy) - 2)
                    
                    # iterate through all child nodes
                    for childIndex in range(0,len(strategy)) :
                        weight = 0
                        if childIndex == targetIndex:
                            weight = category_weight
                        else:
                            # if the other decisions were all 0, make them equally likely
                            if (totalWeight - original_target_node_weight) == Decimal(0):
                                weight = (Decimal(1) - category_weight)/(Decimal(len(strategy) - 1))
                                #print("oldWeight : " + str(original_target_weight))
                                #print("newWeight : " + str(weight))
                            #  if not, multiply a constant that will maintain their relative proportions
                            else:
                                k = (Decimal(1) - category_weight)/(Decimal(1) - original_target_node_weight)
                                weight = Decimal(strategy[childIndex][comboIndex])* Decimal(k)
                            
                        strategy[childIndex][comboIndex] = weight
                        
                        
                        newWeightsTotal = newWeightsTotal + weight
                        newWeightStr = newWeightStr + " " + str(weight)
                        
                    #if round(newWeightsTotal, 8) != 1:
                        #wrongTotal[str(category) + str(comboIndex)] = [originalWeightString, newWeightStr, str(newWeightsTotal)]
        
        if len(wrongTotal) > 1:         
            msg = ""     
            for w in wrongTotal:
                msg += ("(" + str(w) + ")" + ": " + str(wrongTotal[w])) + "\n"
            
            raise Exception("Weight for one or more combos do not add up to 1: \n" + msg)
        
        return strategy

