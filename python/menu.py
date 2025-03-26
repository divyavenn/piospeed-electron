from __future__ import annotations
from enum import Enum
from inputs import Input, FileInput, FolderOf, WeightsFile, BoardFile, Extension, InputType, InputMetadata
from global_var import cfr_folder, nodeBook_folder, strategies_folder

import unittest

#
class Command:
    def __init__(self, name: str, args: list[Input], helptext: str):
        # name of command
        self.name = name
        # arguments needed
        self.args = args
        self.helptext = helptext
        
    def __str__(self):
        return self.name


class PluginCommands(Enum):

    NODELOCK_SOLVE = Command("nodelock and run",
                       [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to nodelock")),
                        WeightsFile (InputMetadata(prompt = "Pick a .json file with the desired weights for each hand category.")),
                        BoardFile (InputMetadata(prompt = "Pick a .json file with the nodeID and board texture for each .cfr file"))],
                       "Allows you to nodelock a folder of files at once.")
    
    RUN_AUTO = Command("run", 
                  [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to run")),
                   BoardFile(InputMetadata(prompt = "Pick a file with the nodeID and board texture for each .cfr file"))],
                  "solves + resaves .cfr file")
    
    RUN_FULL_SAVE = Command("run (full save)", 
                  [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to run")),
                   BoardFile(InputMetadata(prompt = "Pick a .json file with the nodeID and board texture for each .cfr file"))],
                  "solves + resaves .cfr file as mini save (no rivers)")
    
    NODELOCK = Command("nodelock",
                       [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to nodelock")),
                        WeightsFile (InputMetadata(prompt = "Pick a .json file with the desired weights for each hand category.")),
                        BoardFile (InputMetadata(prompt = "Pick a .json file with the nodeID and board texture for each .cfr file"))],
                       "Allows you to nodelock a folder of files at once.")
    
    GET_RESULTS = Command("get results",
                        [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to calculate results without solving")),
                        BoardFile(InputMetadata(prompt = "Pick a file with the nodeID and board texture for each .cfr file"))],
                        "")

    SAVE_NO_RIVERS = Command("resave small (no rivers)",
                            [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to resave"))],
                            "")

    SAVE_NO_TURNS = Command("resave micro (no turns)",
                            [FolderOf(Extension.cfr, InputMetadata(prompt = "Pick a folder of .cfr files to resave"))],
                            "")
    
    SET_ACCURACY = Command("change accuracy", [Input(InputType.number, InputMetadata(prompt = "Enter new accuracy as fraction of pot"))],
                       "Allows you to change accuracy of solver (default is .002)")
    
    END = Command("end", [], "")



#-----------------------------------------------TESTS----------------------------------------------


class Tests(unittest.TestCase):
    def testCommandMap(self):      
        c = Command ("run", {FileInput (Extension.cfr, "Pick a .cfr file to run")})
        self.assertEqual(c.__str__(), "run") 

if __name__ == '__main__': 
    unittest.main() 