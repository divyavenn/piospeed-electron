from __future__ import annotations
import asyncio
from electronInterface import ElectronInterface


async def main():
    try:
        print("\n\n\n\n===============Python Process Starting===============\n\n")
        # Initialize the Electron interface
        interface = ElectronInterface()
        
        # Start the bridge and wait for it to be ready
        await interface.bridge.run()
        
        
    except KeyboardInterrupt:
        print("........user interrupted run!")
    except Exception as e:
        print(f"........Error during startup: {str(e)}")
        
    
    finally:
        try:
            # get all tasks in event loop and close them
            loop = asyncio.get_running_loop()    
            tasks = [t for t in asyncio.all_tasks(loop) if t is not asyncio.current_task()]
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        except RuntimeError:
            pass  # If no event loop is running, we can safely exit


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Goodbye!")