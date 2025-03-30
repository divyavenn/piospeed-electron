from __future__ import annotations
from enum import Enum
from inputs import Input, FileInput, FolderOf, WeightsFile, BoardFile, Extension, InputType

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
                       [FolderOf(Extension.cfr),
                        WeightsFile(),
                        BoardFile()],
                       "Allows you to nodelock a folder of files at once.")
    
    RUN_AUTO = Command("run", 
                  [FolderOf(Extension.cfr),
                   BoardFile()],
                  "solves + resaves .cfr file")
    
    RUN_FULL_SAVE = Command("run (full save)", 
                  [FolderOf(Extension.cfr),
                   BoardFile()],
                  "solves + resaves .cfr file as mini save (no rivers)")
    
    NODELOCK = Command("nodelock",
                       [FolderOf(Extension.cfr),
                        WeightsFile(),
                        BoardFile()],
                       "Allows you to nodelock a folder of files at once.")
    
    GET_RESULTS = Command("get results",
                        [FolderOf(Extension.cfr),
                        BoardFile()],
                        "")

    SAVE_NO_RIVERS = Command("resave small (no rivers)",
                            [FolderOf(Extension.cfr)],
                            "")

    SAVE_NO_TURNS = Command("resave micro (no turns)",
                            [FolderOf(Extension.cfr)],
                            "")
    
    SET_ACCURACY = Command("change accuracy", [Input(InputType.number)],
                       "Allows you to change accuracy of solver (default is .002)")
    
    END = Command("end", [], "")

