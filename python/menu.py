from __future__ import annotations
from enum import Enum
from inputs import Input, CFRFolder, WeightsFile, BoardFile, InputType

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

    NODELOCK_SOLVE = Command("nodelock_solve_full",
                       [CFRFolder(),
                        WeightsFile(),
                        BoardFile()],
                       "Allows you to nodelock a folder of files at once.")
    
    NODELOCK_SOLVE_MINI = Command("nodelock_solve_mini",
                       [CFRFolder(),
                        WeightsFile(),
                        BoardFile()],
                       "Allows you to nodelock a folder of files at once.")
    
    RUN_AUTO = Command("run_mini", 
                  [CFRFolder(),
                   BoardFile()],
                  "solves + resaves .cfr file")
    
    RUN_FULL_SAVE = Command("run_full", 
                  [CFRFolder(),
                   BoardFile()],
                  "solves + resaves .cfr file as mini save (no rivers)")
    
    NODELOCK = Command("nodelock",
                       [CFRFolder(),
                        WeightsFile(),
                        BoardFile()],
                       "Allows you to nodelock a folder of files at once.")
    NODELOCK_MINI = Command("nodelock_mini",
                       [CFRFolder(),
                        WeightsFile(),
                        BoardFile()],
                       "Allows you to nodelock a folder of files at once.")
    
    GET_RESULTS = Command("get_results",
                  [CFRFolder(),
                   BoardFile()],
                        "")
    
    SAVE_NO_RIVERS = Command("save_no_rivers",
                  [CFRFolder()],
                            "")
    
    SAVE_NO_TURNS = Command("save_no_turns",
                  [CFRFolder()],
                            "")
    
    SET_ACCURACY = Command("set_accuracy", [Input(InputType.accuracy)],
                       "Allows you to change accuracy of solver (default is .002)")
    
    END = Command("end", [], "")


if __name__ == "__main__":
    print(PluginCommands["NODELOCK_SOLVE"])