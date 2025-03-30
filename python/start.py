from __future__ import annotations
import asyncio
from bridge import MessageQueue

async def main():
    try:
        print("\n\n\n\n===============Python Process Starting===============\n\n")
        # initialize message queue
        bridge = MessageQueue()
        
        # Start the bridge and wait for it to be ready
        await bridge.run()
        
        
    except KeyboardInterrupt:
        print("........user interrupted run!")
    except Exception as e:
        print(f"Error in main: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up resources
        if 'bridge' in locals():
            await bridge.cleanup()

if __name__ == "__main__":
    asyncio.run(main())