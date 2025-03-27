from __future__ import annotations
import sys
import asyncio
from SolverConnection.solver import Solver
from electronInterface import ElectronInterface
from program import Program


async def main():
    try:
        # Initialize the Electron interface
        interface = ElectronInterface()
        
        # Starts socket in a separate task so it doesn't block other operations
        bridge_task = asyncio.create_task(interface.start_bridge())
        
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
        
        await bridge_task  # Wait for bridge task if needed
    except Exception as e:
        print(f"Error during startup: {str(e)}")
        
if __name__ == "__main__":
    asyncio.run(main())


