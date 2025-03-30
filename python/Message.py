import json
from typing import Any

class Message:
    """
    Message class for communication between Python and Electron
    """
    def __init__(self, type: str, data: Any):
        """
        Initialize a new Message
        
        Args:
            type: The message type
            data: The message data
        """
        self.type = type
        self.data = data
    
    def to_json(self) -> str:
        """
        Convert the message to a JSON string
        
        Returns:
            JSON string representation of the message
        """
        return json.dumps({"type": self.type, "data": self.data})
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Message':
        """
        Create a Message from a JSON string
        
        Args:
            json_str: JSON string representation of a message
            
        Returns:
            A new Message instance
        """
        data = json.loads(json_str)
        return cls(data.get('type'), data.get('data'))