import subprocess
import os
import pathlib

printConsole = False

class SolverException(Exception):
    pass


    
class Solver(object):
    

    def __init__(self, path : str):
        """
        Create a new solver instance.
        """
        self.solverPath = path
        self.accuracy = 0.2
