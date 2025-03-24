import zmq
import json
import sys

class MessageQueue:
    def __init__(self, python="tcp://127.0.0.1:5555", react="tcp://127.0.0.1:5556"):
        self.context = zmq.Context()
        self.me = self.context.socket(zmq.REP)
        self.me.bind(python)
        
        # Publisher socket for notifications
        self.him = self.context.socket(zmq.PUB)
        self.him.bind(react)
        
        print("ZeroMQ server started, waiting for messages...")

    async def recieve(self, message):
        # Read from stdin for direct messages from Electron
        while True:
            line = sys.stdin.readline().strip()
            if line.startswith('SET_SOLVER_PATH:'):
                solver_path = line.replace('SET_SOLVER_PATH:', '')
                return {'type': 'solver_path', 'path': solver_path}
            elif line:
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
        return self.me.recv_json()

    async def send(self, status, message):
        message = json.dumps({'status': status, 'message': message})
        self.him.send_string(message)
        
if __name__ == "__main__":
    server = MessageQueue()
    server.start()