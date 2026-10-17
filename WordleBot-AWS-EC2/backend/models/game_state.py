# app/models/game_state.py

from pydantic import BaseModel
from typing import List

class GameState(BaseModel):
    guesses: List[str]
    feedbacks: List[str]
