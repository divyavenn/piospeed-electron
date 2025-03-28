import os

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


