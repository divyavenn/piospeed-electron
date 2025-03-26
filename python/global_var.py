import os
import sys
import json

# Get mappings directory from environment variable or use default
mappingsPath = os.environ.get('PIOSPEED_MAPPINGS_PATH')

# Try different fallback paths if environment variable is not set or path doesn't exist
if not mappingsPath or not os.path.exists(mappingsPath):
    # 1. Try relative to this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    possible_paths = [
        # Inside frontend/python structure
        os.path.join(os.path.dirname(current_dir), 'public', 'mappings'),
        # Original project structure
        os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'mappings')
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            mappingsPath = path
            break
    
    # If we still don't have a valid path, use the first one anyway and let it fail later
    if not mappingsPath or not os.path.exists(mappingsPath):
        mappingsPath = possible_paths[0]
        # Log warning about missing mappings
        print(json.dumps({
            "type": "warning", 
            "message": f"Could not find mappings directory. Tried: {', '.join(possible_paths)}"
        }), flush=True)

# Default solver path - this will be overridden by the path provided by the user
solverPath = None  # Will be set via config or UI

# Fix hardcoded Windows paths to use platform-independent structure
# These are sample/placeholder paths and will likely be overridden
cfr_folder = os.path.join("samples", "cfr")
strategies_folder = os.path.join("samples", "weights")
nodeBook_folder = os.path.join("samples", "boards")
accuracy = .02  # as a fraction of pot

# Make currentdir cross-platform compatible
currentdir = os.getcwd()
totalCombos = 1326

exception_categories = {"bdfd_1card": 1,
                        "bdfd_2card": 2}

hand_category_index = {"nothing": 0,
                       "king_high": 1,
                       "ace_high": 2,
                       "low_pair": 3,
                       "3rd-pair": 4,
                       "2nd-pair": 5,
                       "underpair": 6,
                       "top_pair": 7,
                       "top_pair_tp": 8,
                       "overpair": 9,
                       "two_pair": 10,
                       "trips": 11, 
                       "set": 12,
                       "straight": 13,
                       "flush": 14,
                       "fullhouse": 15,
                       "top_fullhouse": 16,
                       "quads": 17,
                       "straight_flush": 18}

draw_category_index = {"no_draw": 0,
                       "bdfd_1card": 1,
                       "bdfd_2card": 2,
                       "4out_straight_draw": 3,
                       "8out_straight_draw": 4,
                       "flush_draw": 5,
                       "combo_draw": 6}


