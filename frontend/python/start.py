from __future__ import annotations
import sys
import asyncio
from SolverConnection.solver import Solver
from interface import ElectronInterface
from program import Program


async def main():
    try:
        # Initialize the Electron interface
        interface = ElectronInterface()
        
        # Get solver path from Electron settings
        solver_path = await interface.getSolverPath()
        
        if(solver_path):
            # Connect to the solver
            connection = Solver(solver_path)
            # Report success
            await interface.notify("Solver connected successfully! Welcome to PioSolver")
            
            # Initialize and start the program
            program = Program(connection, interface)
            await program.start()
        else:
            await interface.notify("Error: Solver path not configured in settings")
    except Exception as e:
        await interface.notify(f"Error during startup: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())


