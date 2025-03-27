import asyncio
from bridge import MessageQueue

async def main():
    # Create and start the message queue
    mq = MessageQueue()
    
    try:
        # Start the message loop
        await mq.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
        

if __name__ == "__main__":
    asyncio.run(main()) 